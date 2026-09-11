"use client";

import {createNote, noteToJSON} from "@bullet/sdk";
import {useMemo, useState} from "react";
import {useAccount, useWriteContract} from "wagmi";
import {createPublicClient, http, maxUint256} from "viem";
import {bulletPoolAbi} from "@/abi/BulletPool";
import {erc20Abi} from "@/abi/erc20";
import {resolveUser, postNote} from "@/lib/api";
import {recipientDigestForWallet} from "@/lib/chain";
import {
  AMOUNT_PRESETS,
  addresses,
  arcTestnet,
  DEFAULT_POOL_TOKEN,
  toTokenUnits,
  type PoolToken,
} from "@/lib/config";
import {sealPayload} from "@/lib/crypto";
import {formatError} from "@/lib/errors";
import {upsertPendingSend, removePendingSend} from "@/lib/pendingSends";
import {
  createScratchGiftPayload,
  encodeScratchClaimPayload,
  scratchClaimPath,
  type ScratchTheme,
} from "@/lib/scratchGift";
import {getStoredUser, getToken} from "@/lib/session";
import {toast} from "@/lib/toast";
import {
  filterRecentRecipients,
  rememberRecentRecipient,
} from "@/lib/recentRecipients";
import {useSession} from "@/hooks/useSession";
import {useTokenBalance} from "@/hooks/useUsdcBalance";
import {ConnectButton} from "@/components/ConnectButton";
import {NetworkGate} from "@/components/NetworkGate";
import {ScratchRevealCard} from "@/components/ScratchRevealCard";
import {ScratchSendProgressModal} from "@/components/ScratchSendProgressModal";
import {ScratchSendSuccessModal} from "@/components/ScratchSendSuccessModal";
import {TokenBalanceSelect} from "@/components/TokenSelect";
import {CheckIcon, CopyIcon, LoaderIcon} from "@/components/icons";
import {AmountPills, ErrorBanner, FieldLabel} from "@/components/ui";

const THEMES: Array<{
  id: ScratchTheme;
  label: string;
  swatch: string;
  ring: string;
}> = [
  {
    id: "crimson",
    label: "Orange",
    swatch: "bg-[#f07a1a]",
    ring: "ring-[#f07a1a]/40",
  },
  {
    id: "azure",
    label: "Azure",
    swatch: "bg-[#2f6fed]",
    ring: "ring-[#2f6fed]/40",
  },
  {
    id: "emerald",
    label: "Emerald",
    swatch: "bg-[#0f9f6e]",
    ring: "ring-[#0f9f6e]/40",
  },
];

type Step =
  | "idle"
  | "resolving"
  | "creating"
  | "approving"
  | "depositing"
  | "posting";

type ProgressStep = Exclude<Step, "idle">;

export function ScratchPaymentForm() {
  const {address, isConnected} = useAccount();
  const {writeContractAsync} = useWriteContract();
  const {isSignedIn, user: me} = useSession();
  const [selectedToken, setSelectedToken] =
    useState<PoolToken>(DEFAULT_POOL_TOKEN);
  const {hasEnough, formatted: tokenBalance} = useTokenBalance(selectedToken);
  const [recipient, setRecipient] = useState("");
  const [cardName, setCardName] = useState("Scratch & Win");
  const [theme, setTheme] = useState<ScratchTheme>("crimson");
  const [amount, setAmount] = useState<number | null>(AMOUNT_PRESETS[1] ?? 10);
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState("");
  const [statusHint, setStatusHint] = useState("");
  const [includeApprove, setIncludeApprove] = useState(true);
  const [claimUrl, setClaimUrl] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [recipientFocused, setRecipientFocused] = useState(false);
  const [recentTick, setRecentTick] = useState(0);
  const [success, setSuccess] = useState<{
    title: string;
    theme: ScratchTheme;
    amountLabel: string;
    tokenSymbol: string;
    recipientUsername: string;
    claimUrl: string;
    depositHash: string;
  } | null>(null);

  const busy = step !== "idle";
  const previewTitle = cardName.trim() || "Scratch & Win";
  const previewAmount = String(amount ?? AMOUNT_PRESETS[1] ?? 10);
  const previewRecipient = recipient.trim().replace(/^@/, "");
  const recentRecipients = useMemo(
    () =>
      filterRecentRecipients("twitter", recipient, {
        exclude: me?.username,
        limit: 5,
      }),
    [recipient, me?.username, recentTick]
  );

  function rememberRecipient(username: string) {
    rememberRecentRecipient("twitter", username);
    setRecentTick((n) => n + 1);
  }

  async function copyClaimLink() {
    if (!claimUrl) return;
    try {
      await navigator.clipboard.writeText(claimUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 1600);
    } catch {
      toast.error("Couldn’t copy link");
    }
  }

  async function handleSend() {
    if (!address || !amount) return;
    const authToken = getToken();
    const meUser = getStoredUser();
    if (!authToken || !meUser) {
      setError("Sign in at /register first so we can deliver the scratch gift.");
      return;
    }
    if (!recipient.trim()) {
      setError("Recipient username is required.");
      return;
    }
    if (!hasEnough(amount)) {
      setError(
        `Insufficient ${selectedToken.symbol}. Balance is ${tokenBalance} ${selectedToken.symbol}.`
      );
      return;
    }

    setError("");
    setClaimUrl("");
    setStatusHint("Looking up recipient…");
    setIncludeApprove(true);

    try {
      setStep("resolving");
      const resolved = await resolveUser(recipient.trim().replace(/^@/, ""));
      if (!resolved) {
        setError("User not found. They need to register first.");
        setStep("idle");
        setStatusHint("");
        return;
      }

      const {pool} = addresses();
      const tokenAddr = selectedToken.address;
      const units = toTokenUnits(amount, selectedToken.decimals);
      const amountLabel = String(amount);
      const digest = recipientDigestForWallet(resolved.wallet);
      const title = cardName.trim() || "Scratch & Win";

      setStatusHint("Building a private scratch note…");
      setStep("creating");
      const note = await createNote({
        recipientDigest: digest,
        amount: units,
        token: tokenAddr,
      });
      const json = noteToJSON(note);
      const commitment = json.commitmentBytes32;

      const draftPayload = createScratchGiftPayload({
        note: json,
        amountLabel,
        tokenSymbol: selectedToken.symbol,
        recipientUsername: resolved.username,
        meta: {title, theme},
      });
      const draftEncoded = encodeScratchClaimPayload(draftPayload.claim);
      setClaimUrl(
        typeof window === "undefined"
          ? scratchClaimPath(draftEncoded)
          : `${window.location.origin}${scratchClaimPath(draftEncoded)}`
      );

      const plaintext = JSON.stringify(draftPayload);
      const sealed = sealPayload(plaintext, resolved.bulletPublicKey);

      const client = createPublicClient({
        chain: arcTestnet,
        transport: http(),
      });
      const allowance = await client.readContract({
        address: tokenAddr,
        abi: erc20Abi,
        functionName: "allowance",
        args: [address, pool],
      });

      const needsApprove = allowance < units;
      setIncludeApprove(needsApprove);

      if (needsApprove) {
        setStatusHint(
          `Approve ${selectedToken.symbol} in your wallet (one-time)…`
        );
        setStep("approving");
        const approveHash = await writeContractAsync({
          address: tokenAddr,
          abi: erc20Abi,
          functionName: "approve",
          args: [pool, maxUint256],
          chainId: arcTestnet.id,
        });
        setStatusHint("Waiting for approval confirmation…");
        await client.waitForTransactionReceipt({hash: approveHash});
      }

      setStatusHint("Confirm deposit in your wallet…");
      setStep("depositing");
      const hash = await writeContractAsync({
        address: pool,
        abi: bulletPoolAbi,
        functionName: "deposit",
        args: [tokenAddr, units, commitment],
        chainId: arcTestnet.id,
      });
      setStatusHint("Waiting for deposit confirmation…");
      await client.waitForTransactionReceipt({hash});

      upsertPendingSend({
        commitment,
        noteJson: json,
        payloadPlaintext: plaintext,
        encryptedPayload: sealed,
        depositTxHash: hash,
        recipientUsername: resolved.username,
        recipientBulletPublicKey: resolved.bulletPublicKey,
        amount: String(amount),
        tokenSymbol: selectedToken.symbol,
      });

      setStatusHint("Sealing gift into their inbox…");
      setStep("posting");
      const created = await postNote(authToken, {
        recipientUsername: resolved.username,
        commitment,
        encryptedPayload: sealed,
        depositTxHash: hash,
        amount: String(amount),
        tokenSymbol: selectedToken.symbol,
      });
      removePendingSend(commitment);

      const finalPayload = createScratchGiftPayload({
        note: json,
        noteId: created.id,
        amountLabel,
        tokenSymbol: selectedToken.symbol,
        recipientUsername: resolved.username,
        meta: {title, theme},
      });
      const finalEncoded = encodeScratchClaimPayload(finalPayload.claim);
      const finalClaimUrl =
        typeof window === "undefined"
          ? scratchClaimPath(finalEncoded)
          : `${window.location.origin}${scratchClaimPath(finalEncoded)}`;

      setClaimUrl(finalClaimUrl);
      rememberRecipient(resolved.username);
      setStatusHint("");
      setSuccess({
        title,
        theme,
        amountLabel,
        tokenSymbol: selectedToken.symbol,
        recipientUsername: resolved.username,
        claimUrl: finalClaimUrl,
        depositHash: hash,
      });
      setStep("idle");
      toast.success("Gift card sent.");
    } catch (e) {
      const msg = formatError(e);
      setError(msg);
      toast.error(msg);
      setStatusHint("");
      setStep("idle");
    }
  }

  if (!isConnected) {
    return (
      <div className="mx-auto max-w-md rounded-[1.75rem] border border-fog bg-white/95 p-6 text-center shadow-[0_18px_40px_-28px_rgba(10,10,10,0.35)] sm:p-8">
        <p className="text-sm text-graphite">
          Connect your wallet to create and send a gift card.
        </p>
        <div className="mt-4 flex justify-center">
          <ConnectButton label="Connect wallet" />
        </div>
      </div>
    );
  }

  const previewCard = (
    <ScratchRevealCard
      meta={{
        title: previewTitle,
        theme,
      }}
      amountLabel={previewAmount}
      tokenSymbol={selectedToken.symbol}
      recipientLabel={
        previewRecipient ? `@${previewRecipient}` : undefined
      }
      disabled
      tilt
    />
  );

  const formFields = !isSignedIn ? (
    <div className="space-y-4 text-center">
      <p className="text-sm text-graphite">
        Sign in so the encrypted gift card can land in their inbox.
      </p>
      <a href="/register" className="btn-primary">
        Sign in
      </a>
    </div>
  ) : (
    <>
      {error ? <ErrorBanner message={error} /> : null}

      <div className="space-y-2">
        <FieldLabel>Send to username</FieldLabel>
        <div className={`field !py-0 ${busy ? "opacity-60" : ""}`}>
          <div className="flex items-center gap-2">
            <span className="pl-1 text-lg font-semibold text-graphite">@</span>
            <input
              value={recipient.replace(/^@/, "")}
              onChange={(e) =>
                setRecipient(e.target.value.replace(/^@+/, ""))
              }
              onFocus={() => setRecipientFocused(true)}
              onBlur={() =>
                window.setTimeout(() => setRecipientFocused(false), 120)
              }
              placeholder="username"
              disabled={busy}
              className="min-w-0 flex-1 bg-transparent py-3.5 text-lg text-ink outline-none disabled:cursor-not-allowed"
            />
          </div>
        </div>
        {recipientFocused && recentRecipients.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-fog bg-white">
            {recentRecipients.map((r) => (
              <button
                key={r.value}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setRecipient(r.value);
                  setRecipientFocused(false);
                }}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-ink hover:bg-paper"
              >
                @{r.value}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <FieldLabel>Gift card name</FieldLabel>
        <input
          value={cardName}
          onChange={(e) => setCardName(e.target.value)}
          placeholder="Scratch & Win"
          maxLength={32}
          disabled={busy}
          className="field disabled:cursor-not-allowed disabled:opacity-60"
        />
        <p className="text-[11px] text-graphite">
          Printed on the ticket — keep it short.
        </p>
      </div>

      <div className="space-y-2">
        <FieldLabel>Card color</FieldLabel>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((opt) => {
            const on = theme === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={busy}
                onClick={() => setTheme(opt.id)}
                className={`flex min-w-0 flex-col items-center gap-2 rounded-2xl border px-2 py-3 transition-all disabled:opacity-50 ${
                  on
                    ? `border-ink bg-white shadow-[0_8px_20px_-14px_rgba(10,10,10,0.45)] ring-2 ${opt.ring}`
                    : "border-fog bg-white text-graphite hover:border-graphite"
                }`}
              >
                <span
                  className={`h-8 w-8 rounded-full shadow-inner ${opt.swatch}`}
                  aria-hidden
                />
                <span
                  className={`truncate text-xs font-semibold sm:text-sm ${
                    on ? "text-ink" : "text-graphite"
                  }`}
                >
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <FieldLabel>Token</FieldLabel>
        <TokenBalanceSelect
          value={selectedToken}
          onChange={setSelectedToken}
          disabled={busy}
        />
      </div>

      <div className="space-y-2">
        <FieldLabel>Amount</FieldLabel>
        <AmountPills
          amounts={AMOUNT_PRESETS}
          value={amount}
          onChange={setAmount}
          disabled={busy}
          canAfford={hasEnough}
          symbol={selectedToken.symbol}
        />
      </div>

      <button
        type="button"
        onClick={() => void handleSend()}
        disabled={busy || !recipient.trim() || !amount}
        className="btn-primary"
      >
        {busy ? <LoaderIcon className="h-5 w-5 animate-spin" /> : null}
        {busy ? "Creating gift card…" : "Create gift card"}
      </button>

      {claimUrl && !busy ? (
        <div className="rounded-2xl border border-fog bg-paper/80 px-3.5 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] uppercase tracking-[0.14em] text-graphite">
              Claim link
            </p>
            <button
              type="button"
              onClick={() => void copyClaimLink()}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink hover:opacity-70"
            >
              {copiedLink ? (
                <CheckIcon className="h-3.5 w-3.5" />
              ) : (
                <CopyIcon className="h-3.5 w-3.5" />
              )}
              {copiedLink ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-1.5 truncate font-mono text-[11px] text-ink" title={claimUrl}>
            {claimUrl}
          </p>
        </div>
      ) : null}
    </>
  );

  return (
    <NetworkGate>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:gap-7 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        {/* Left: sticky controls */}
        <aside className="order-2 lg:order-1 lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-5 rounded-[1.75rem] border border-fog bg-white/95 p-5 shadow-[0_18px_40px_-28px_rgba(10,10,10,0.35)] backdrop-blur-sm sm:p-6">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-graphite">
                Customize
              </p>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-ink">
                Build your gift card
              </h2>
            </div>
            <div className="space-y-5">{formFields}</div>
          </div>
        </aside>

        {/* Right: live ticket stage */}
        <section className="order-1 lg:order-2 lg:sticky lg:top-24 lg:self-start">
          <div className="relative overflow-hidden rounded-[1.75rem] bg-[#0a0a0a] px-5 py-8 sm:px-8 sm:py-10 lg:min-h-[28rem] lg:px-10 lg:py-12">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-[46%] opacity-[0.22] contrast-125 grayscale"
              style={{
                backgroundImage: `
                  radial-gradient(circle at 18% 36%, rgba(255,255,255,0.22) 0 1px, transparent 1.5px),
                  radial-gradient(circle at 62% 28%, rgba(255,255,255,0.16) 0 1px, transparent 1.5px),
                  radial-gradient(circle at 84% 52%, rgba(255,255,255,0.14) 0 1px, transparent 1.5px),
                  repeating-linear-gradient(90deg, transparent 0 6px, rgba(255,255,255,0.04) 6px 7px),
                  repeating-linear-gradient(0deg, transparent 0 5px, rgba(255,255,255,0.035) 5px 6px)
                `,
                backgroundSize: "18px 18px, 22px 22px, 16px 16px, auto, auto",
              }}
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black to-transparent" />

            <div className="relative mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/45">
                  Live preview
                </p>
                <p className="mt-1 text-sm font-semibold text-white/90">
                  {previewAmount} {selectedToken.symbol}
                  {previewRecipient ? (
                    <span className="text-white/50">
                      {" "}
                      → @{previewRecipient}
                    </span>
                  ) : (
                    <span className="text-white/40"> · pick a recipient</span>
                  )}
                </p>
              </div>
              <p className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white/55">
                Lottery ticket
              </p>
            </div>

            <div className="relative mx-auto max-w-lg px-2 sm:px-4">
              {previewCard}
            </div>

            <p className="relative mx-auto mt-7 max-w-sm text-center text-[12px] leading-relaxed text-white/45">
              They scratch the silver panel, then claim privately from Inbox →
              Gift cards.
            </p>
          </div>
        </section>
      </div>

      {busy ? (
        <ScratchSendProgressModal
          step={step as ProgressStep}
          includeApprove={includeApprove}
          statusHint={statusHint}
          title={previewTitle}
          theme={theme}
          amountLabel={previewAmount}
          tokenSymbol={selectedToken.symbol}
          recipientUsername={previewRecipient}
        />
      ) : null}

      {success ? (
        <ScratchSendSuccessModal
          title={success.title}
          theme={success.theme}
          amountLabel={success.amountLabel}
          tokenSymbol={success.tokenSymbol}
          recipientUsername={success.recipientUsername}
          claimUrl={success.claimUrl}
          depositHash={success.depositHash}
          onClose={() => setSuccess(null)}
        />
      ) : null}
    </NetworkGate>
  );
}
