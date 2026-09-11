"use client";

import {useEffect, useMemo, useState} from "react";
import {useAccount, useWriteContract} from "wagmi";
import {createNote, noteToJSON} from "@bullet/sdk";
import {createPublicClient, http, maxUint256} from "viem";
import {bulletPoolAbi} from "@/abi/BulletPool";
import {erc20Abi} from "@/abi/erc20";
import {postNote, resolveUser} from "@/lib/api";
import {recipientDigestForWallet} from "@/lib/chain";
import {
  AMOUNT_PRESETS,
  addresses,
  arcTestnet,
  DEFAULT_POOL_TOKEN,
  explorerTx,
  getPoolToken,
  toTokenUnits,
  type PoolToken,
} from "@/lib/config";
import {sealPayload} from "@/lib/crypto";
import {
  listPendingSends,
  removePendingSend,
  upsertPendingSend,
  type PendingSend,
} from "@/lib/pendingSends";
import {
  filterRecentRecipients,
  rememberRecentRecipient,
} from "@/lib/recentRecipients";
import {
  copyPaymentShareImage,
  sharePaymentOnTwitter,
  type PaymentShareDetails,
} from "@/lib/sharePayment";
import {PaymentSharePreview} from "@/components/PaymentSharePreview";
import {getToken, getStoredUser} from "@/lib/session";
import {toast} from "@/lib/toast";
import {formatError, formatErrorTitle} from "@/lib/errors";
import type {PublicUser} from "@/shared";
import {ConnectButton} from "@/components/ConnectButton";
import {NetworkGate} from "@/components/NetworkGate";
import {
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  LoaderIcon,
  MinusIcon,
  PlusIcon,
  XBrandIcon,
} from "@/components/icons";
import {
  formatRecipientLabel,
  normalizeRecipient,
  RecipientKindIcon,
  type RecipientKind,
} from "@/components/RecipientKind";
import {useSession} from "@/hooks/useSession";
import {useTokenBalance} from "@/hooks/useUsdcBalance";
import {shortAddr} from "@/lib/address";
import {TokenBalanceSelect} from "@/components/TokenSelect";
import {UserAvatar} from "@/components/UserAvatar";
import {
  AmountPills,
  ErrorBanner,
  FieldLabel,
  Panel,
} from "@/components/ui";

type Step =
  | "idle"
  | "resolving"
  | "creating"
  | "approving"
  | "depositing"
  | "posting"
  | "done"
  | "undelivered"
  | "error";

const AMOUNT_STEP = 1;

type FlowStepId = "note" | "approve" | "deposit" | "deliver";

function flowSteps(includeApprove: boolean): {id: FlowStepId; label: string}[] {
  if (includeApprove) {
    return [
      {id: "note", label: "Note"},
      {id: "approve", label: "Approve"},
      {id: "deposit", label: "Deposit"},
      {id: "deliver", label: "Deliver"},
    ];
  }
  return [
    {id: "note", label: "Note"},
    {id: "deposit", label: "Deposit"},
    {id: "deliver", label: "Deliver"},
  ];
}

function activeFlowId(step: Step): FlowStepId | "done" | null {
  switch (step) {
    case "creating":
      return "note";
    case "approving":
      return "approve";
    case "depositing":
      return "deposit";
    case "posting":
    case "undelivered":
      return "deliver";
    case "done":
      return "done";
    default:
      return null;
  }
}

function isValidAmountInput(raw: string, maxDecimals: number): boolean {
  if (raw === "") return true;
  const re = new RegExp(`^\\d*\\.?\\d{0,${maxDecimals}}$`);
  return re.test(raw);
}

function parseAmountInput(raw: string): number | null {
  if (!raw || raw === ".") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function formatAmountDisplay(n: number, decimals: number): string {
  return n
    .toFixed(decimals)
    .replace(/(\.\d*?[1-9])0+$/, "$1")
    .replace(/\.0+$/, "");
}

function roundAmount(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

export function SendForm({initialRecipient}: {initialRecipient?: string}) {
  const {address, isConnected} = useAccount();
  const {writeContractAsync} = useWriteContract();
  const {isSignedIn, user: me} = useSession();
  const [selectedToken, setSelectedToken] =
    useState<PoolToken>(DEFAULT_POOL_TOKEN);
  const {
    hasEnough,
    formatted: tokenBalance,
    refetch: refetchBalance,
  } = useTokenBalance(selectedToken);

  const [recipient, setRecipient] = useState(initialRecipient ?? "");
  const [recipientKind, setRecipientKind] = useState<
    Exclude<RecipientKind, "unknown">
  >("twitter");
  const [resolved, setResolved] = useState<PublicUser | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [amountText, setAmountText] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");
  const [commitment, setCommitment] = useState("");
  const [sentTokenSymbol, setSentTokenSymbol] = useState(
    DEFAULT_POOL_TOKEN.symbol
  );
  const [sentUsername, setSentUsername] = useState("");
  const [sentAmount, setSentAmount] = useState<number | null>(null);
  /** False once we know allowance already covers this send (skip approve tx). */
  const [includeApprove, setIncludeApprove] = useState(true);
  const [approveHash, setApproveHash] = useState("");
  const [statusHint, setStatusHint] = useState("");

  const sendInFlight =
    step === "creating" ||
    step === "approving" ||
    step === "depositing" ||
    step === "posting";

  const busy =
    step === "resolving" ||
    sendInFlight;

  const [pendingSends, setPendingSends] = useState<PendingSend[]>([]);
  const [retryingCommitment, setRetryingCommitment] = useState<string | null>(
    null
  );
  const [recipientFocused, setRecipientFocused] = useState(false);
  const [recentTick, setRecentTick] = useState(0);

  const amountDecimals = selectedToken.decimals;

  const recentSuggestions = useMemo(() => {
    void recentTick;
    return filterRecentRecipients(recipientKind, recipient, {
      exclude: me?.username,
      limit: 6,
    });
  }, [recipientKind, recipient, me?.username, recentTick]);

  function refreshRecent() {
    setRecentTick((n) => n + 1);
  }

  function rememberRecipient(
    kind: Exclude<RecipientKind, "unknown">,
    value: string
  ) {
    rememberRecentRecipient(kind, value);
    refreshRecent();
  }

  function refreshPending() {
    setPendingSends(listPendingSends());
  }

  useEffect(() => {
    refreshPending();
  }, []);

  async function deliverPending(pending: PendingSend): Promise<boolean> {
    const authToken = getToken();
    if (!authToken) {
      toast.error("Sign in to deliver the encrypted note.");
      return false;
    }
    setRetryingCommitment(pending.commitment);
    setError("");
    setStatusHint("Delivering encrypted note…");
    try {
      setStep("posting");
      const sealed = sealPayload(
        pending.payloadPlaintext ?? JSON.stringify(pending.noteJson),
        pending.recipientBulletPublicKey
      );
      upsertPendingSend({...pending, encryptedPayload: sealed});
      await postNote(authToken, {
        recipientUsername: pending.recipientUsername,
        commitment: pending.commitment,
        encryptedPayload: sealed,
        depositTxHash: pending.depositTxHash,
        amount: pending.amount,
        tokenSymbol: pending.tokenSymbol,
      });
      removePendingSend(pending.commitment);
      refreshPending();
      setCommitment(pending.commitment);
      setTxHash(pending.depositTxHash);
      setSentTokenSymbol(pending.tokenSymbol);
      setSentUsername(pending.recipientUsername);
      setSentAmount(Number(pending.amount) || null);
      setStep("done");
      rememberRecipient("twitter", pending.recipientUsername);
      toast.success("Note delivered. Recipient can claim from Inbox.");
      return true;
    } catch (e) {
      const msg = formatError(e);
      setError(msg);
      toast.error(msg);
      setStep("undelivered");
      refreshPending();
      return false;
    } finally {
      setRetryingCommitment(null);
    }
  }

  function applyAmount(n: number | null) {
    if (n == null || !Number.isFinite(n) || n <= 0) {
      setAmount(null);
      setAmountText("");
      return;
    }
    const rounded = roundAmount(n, amountDecimals);
    setAmount(rounded);
    setAmountText(formatAmountDisplay(rounded, amountDecimals));
  }

  function onAmountTextChange(raw: string) {
    if (!isValidAmountInput(raw, amountDecimals)) return;
    setAmountText(raw);
    const parsed = parseAmountInput(raw);
    setAmount(
      parsed != null && parsed > 0
        ? roundAmount(parsed, amountDecimals)
        : null
    );
  }

  function bumpAmount(delta: number) {
    const next = roundAmount((amount ?? 0) + delta, amountDecimals);
    if (next <= 0) {
      applyAmount(null);
      return;
    }
    applyAmount(next);
  }

  function onTokenChange(token: PoolToken) {
    setSelectedToken(token);
    if (amount != null) {
      const rounded = roundAmount(amount, token.decimals);
      setAmount(rounded);
      setAmountText(formatAmountDisplay(rounded, token.decimals));
    }
  }

  function resetAfterSuccess() {
    setStep("idle");
    setResolved(null);
    setAmount(null);
    setAmountText("");
    setRecipient("");
    setTxHash("");
    setCommitment("");
    setError("");
    setSentUsername("");
    setSentAmount(null);
    setIncludeApprove(true);
    setApproveHash("");
    setStatusHint("");
  }

  async function handleResolve() {
    setError("");
    setResolved(null);
    setStep("resolving");
    try {
      const user = await resolveUser(normalizeRecipient(recipient, recipientKind));
      if (!user) {
        setError("User not found. They need to register first.");
        setStep("error");
        return;
      }
      setResolved(user);
      setStep("idle");
      rememberRecipient(
        recipientKind,
        recipientKind === "email" ? recipient : user.username
      );
    } catch (e) {
      setError(formatError(e));
    }
  }

  async function handleSend() {
    setError("");
    if (!address || !resolved || amount == null) return;
    const authToken = getToken();
    const meUser = getStoredUser();
    if (!authToken || !meUser) {
      setError("Sign in at /register first so we can deliver the encrypted note.");
      setStep("error");
      return;
    }
    if (!hasEnough(amount)) {
      setError(
        `Insufficient ${selectedToken.symbol}. Balance is ${tokenBalance} ${selectedToken.symbol}.`
      );
      setStep("error");
      toast.error(
        `Insufficient ${selectedToken.symbol}. Balance is ${tokenBalance} ${selectedToken.symbol}.`
      );
      return;
    }

    const {pool} = addresses();
    const tokenAddr = selectedToken.address;
    const units = toTokenUnits(amount, selectedToken.decimals);

    try {
      setIncludeApprove(true);
      setApproveHash("");
      setStatusHint("Building a private note…");
      setStep("creating");
      const digest = recipientDigestForWallet(resolved.wallet);
      const note = await createNote({
        recipientDigest: digest,
        amount: units,
        token: tokenAddr,
      });
      const json = noteToJSON(note);
      const commitmentBytes32 = json.commitmentBytes32;
      setCommitment(commitmentBytes32);

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

      // Any pool token: one-time maxUint256 approve, then skip forever while covered.
      const needsApprove = allowance < units;
      setIncludeApprove(needsApprove);

      if (needsApprove) {
        setStatusHint(
          `One-time max approval for ${selectedToken.symbol}… Confirm in wallet.`
        );
        setStep("approving");
        const nextApproveHash = await writeContractAsync({
          address: tokenAddr,
          abi: erc20Abi,
          functionName: "approve",
          args: [pool, maxUint256],
          chainId: arcTestnet.id,
        });
        setApproveHash(nextApproveHash);
        setStatusHint("Waiting for approval confirmation…");
        await client.waitForTransactionReceipt({hash: nextApproveHash});
      } else {
        setStatusHint("Allowance already set — skipping approve.");
      }

      setStatusHint("Confirm deposit in your wallet…");
      setStep("depositing");
      const depositHash = await writeContractAsync({
        address: pool,
        abi: bulletPoolAbi,
        functionName: "deposit",
        args: [tokenAddr, units, commitmentBytes32],
        chainId: arcTestnet.id,
      });
      setTxHash(depositHash);
      setStatusHint("Waiting for deposit confirmation on Arc…");
      await client.waitForTransactionReceipt({hash: depositHash});

      // Persist sealed note before POST so delivery can be retried without
      // depositing again if the backend/RPC call fails.
      const sealed = sealPayload(JSON.stringify(json), resolved.bulletPublicKey);
      upsertPendingSend({
        commitment: commitmentBytes32,
        noteJson: json,
        payloadPlaintext: JSON.stringify(json),
        encryptedPayload: sealed,
        depositTxHash: depositHash,
        recipientUsername: resolved.username,
        recipientBulletPublicKey: resolved.bulletPublicKey,
        amount: String(amount),
        tokenSymbol: selectedToken.symbol,
      });
      refreshPending();

      setStatusHint("Delivering encrypted note…");
      setStep("posting");
      try {
        await postNote(authToken, {
          recipientUsername: resolved.username,
          commitment: commitmentBytes32,
          encryptedPayload: sealed,
          depositTxHash: depositHash,
          amount: String(amount),
          tokenSymbol: selectedToken.symbol,
        });
        removePendingSend(commitmentBytes32);
        refreshPending();
      } catch (postErr) {
        const msg = formatError(postErr);
        setError(msg);
        setStatusHint("Deposit confirmed — note delivery failed.");
        toast.error(
          "Deposit confirmed, but note delivery failed. Retry deliver — do not send again."
        );
        setStep("undelivered");
        void refetchBalance();
        return;
      }

      setSentTokenSymbol(selectedToken.symbol);
      setSentUsername(resolved.username);
      setSentAmount(amount);
      setStatusHint("Payment complete.");
      setStep("done");
      rememberRecipient(
        recipientKind,
        recipientKind === "email" ? recipient : resolved.username
      );
      void refetchBalance();
    } catch (e) {
      const msg = formatError(e);
      setError(msg);
      toast.error(msg);
      setStep("error");
      setStatusHint("");
      refreshPending();
    }
  }

  const showRecipientLookup = !resolved || step === "done";

  const showStatusModal =
    sendInFlight || step === "done" || step === "undelivered";

  // Only list undelivered notes when idle — during send we persist pending
  // before POST, which would flash "Retry deliver" under the status modal.
  const idlePending = showStatusModal
    ? []
    : pendingSends.filter(
        (p) =>
          !commitment ||
          p.commitment.toLowerCase() !== commitment.toLowerCase()
      );

  return (
    <>
      <div
        className={
          showStatusModal
            ? "pointer-events-none select-none opacity-40 transition-opacity duration-300"
            : undefined
        }
        aria-hidden={showStatusModal || undefined}
      >
      {idlePending.length > 0 ? (
        <PendingDeliveriesPanel
          items={idlePending}
          retryingCommitment={retryingCommitment}
          onRetry={(p) => void deliverPending(p)}
        />
      ) : null}

      <Panel className="space-y-6 text-left">
        {!isConnected ? (
          <div className="space-y-4 py-2 text-center">
            <p className="text-sm text-graphite">
              Connect an Arc wallet to deposit a private note.
            </p>
            <ConnectButton label="Connect wallet" />
          </div>
        ) : (
          <NetworkGate>
            {!isSignedIn ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-graphite">
                  {me
                    ? `Signed profile @${me.username} loaded. Sign in to send.`
                    : "Sign in so we can deliver the encrypted note."}
                </p>
                <a href="/register" className="btn-primary">
                  {me ? "Sign in" : "Sign in or register"}
                </a>
              </div>
            ) : showRecipientLookup ? (
              <>
                <TokenBalanceSelect
                  value={selectedToken}
                  onChange={onTokenChange}
                  disabled={busy}
                />
                <div className="space-y-4">
                  <div className="flex items-end justify-between gap-3">
                    <FieldLabel>To</FieldLabel>
                    <p className="pb-0.5 font-mono text-[11px] text-graphite">
                      {recipientKind === "email" ? "Email" : "Username"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-fog bg-white px-5 py-5">
                    <p className="flex items-center gap-2.5 text-5xl font-bold tracking-tight">
                      {recipientKind !== "email" ? (
                        <span
                          className={`text-3xl font-semibold ${
                            recipient.trim() ? "text-graphite" : "text-fog"
                          }`}
                        >
                          @
                        </span>
                      ) : null}
                      {recipient.trim() ? (
                        <span
                          key={recipient.trim()}
                          className="animate-amount-pop min-w-0 truncate motion-reduce:animate-none"
                        >
                          {recipientKind === "email"
                            ? recipient.trim()
                            : recipient.trim().replace(/^@/, "")}
                        </span>
                      ) : (
                        <span className="text-fog">
                          {recipientKind === "email" ? "—" : "username"}
                        </span>
                      )}
                    </p>
                    <p className="mt-2 text-sm text-graphite">
                      Who gets the silent note. We resolve their wallet and
                      encryption key.
                    </p>
                  </div>

                  <div
                    role="radiogroup"
                    aria-label="Recipient type"
                    className="flex rounded-2xl border border-fog bg-paper/70 p-1"
                  >
                    {(
                      [
                        {id: "twitter" as const, label: "Username"},
                        {id: "email" as const, label: "Email"},
                      ] as const
                    ).map((opt) => {
                      const selected = recipientKind === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          disabled={busy || step === "done"}
                          onClick={() => {
                            setRecipientKind(opt.id);
                            setRecipient("");
                            setError("");
                          }}
                          className={`relative flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 disabled:opacity-50 ${
                            selected
                              ? "bg-ink text-paper shadow-[0_1px_2px_rgba(10,10,10,0.18)]"
                              : "bg-transparent text-graphite hover:bg-white/80 hover:text-ink"
                          }`}
                        >
                          <RecipientKindIcon
                            kind={opt.id}
                            className="h-3.5 w-3.5"
                          />
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>

                  <div
                    className={`field flex items-center gap-1.5 !py-0 ${
                      busy || step === "done" ? "opacity-50" : ""
                    }`}
                  >
                    {recipientKind !== "email" ? (
                      <span
                        className="shrink-0 select-none pl-1 text-lg font-semibold text-graphite"
                        aria-hidden
                      >
                        @
                      </span>
                    ) : null}
                    <input
                      type="text"
                      inputMode={
                        recipientKind === "email" ? "email" : "text"
                      }
                      autoCapitalize="none"
                      autoCorrect="off"
                      placeholder={
                        recipientKind === "email"
                          ? "name@email.com"
                          : "username"
                      }
                      value={
                        recipientKind === "email"
                          ? recipient
                          : recipient.replace(/^@/, "")
                      }
                      onChange={(e) => {
                        const raw = e.target.value.trimStart();
                        setRecipient(
                          recipientKind === "email"
                            ? raw
                            : raw.replace(/^@+/g, "")
                        );
                      }}
                      onFocus={() => setRecipientFocused(true)}
                      onBlur={() => {
                        // Allow suggestion click before closing.
                        window.setTimeout(() => setRecipientFocused(false), 120);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && recipient.trim())
                          void handleResolve();
                      }}
                      disabled={busy || step === "done"}
                      autoComplete="off"
                      spellCheck={false}
                      className="min-w-0 flex-1 bg-transparent py-3.5 text-lg text-ink outline-none placeholder:text-fog disabled:cursor-not-allowed"
                    />
                  </div>

                  {(recipientFocused || !recipient.trim()) &&
                  recentSuggestions.length > 0 ? (
                    <div
                      role="listbox"
                      aria-label="Recent recipients"
                      className="overflow-hidden rounded-2xl border border-fog bg-white"
                    >
                      <p className="border-b border-fog/80 px-4 py-2 text-[10px] font-medium uppercase tracking-[0.14em] text-graphite">
                        {recipient.trim() ? "Matches" : "Recent"}
                      </p>
                      <ul>
                        {recentSuggestions.map((r) => (
                          <li key={`${r.kind}:${r.value}`}>
                            <button
                              type="button"
                              role="option"
                              disabled={busy || step === "done"}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setRecipient(r.value);
                                setError("");
                                setRecipientFocused(false);
                              }}
                              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-ink transition-colors hover:bg-paper disabled:opacity-50"
                            >
                              <RecipientKindIcon
                                kind={r.kind}
                                className="h-3.5 w-3.5 shrink-0 text-graphite"
                              />
                              <span className="min-w-0 truncate">
                                {r.kind === "email" ? r.value : `@${r.value}`}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  disabled={busy || step === "done" || !recipient.trim()}
                  onClick={handleResolve}
                  className="btn-primary"
                >
                  {step === "resolving" ? (
                    <LoaderIcon className="h-5 w-5 animate-spin" />
                  ) : null}
                  {step === "resolving" ? "Looking up…" : "Continue"}
                </button>
              </>
            ) : (
              <>
                <TokenBalanceSelect
                  value={selectedToken}
                  onChange={onTokenChange}
                  disabled={busy}
                />
                <div className="animate-soft-rise space-y-5 motion-reduce:animate-none">
                <div className="rounded-2xl border border-fog bg-white px-4 py-3.5 sm:px-5">
                  <div className="flex items-center gap-3 sm:gap-3.5">
                    <UserAvatar
                      address={resolved.wallet}
                      size="md"
                      className="animate-avatar-in shrink-0 motion-reduce:animate-none"
                    />
                    <div
                      className="min-w-0 flex-1 animate-soft-rise motion-reduce:animate-none"
                      style={{animationDelay: "80ms"}}
                    >
                      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-graphite">
                        Paying
                      </p>
                      <p className="mt-0.5 flex min-w-0 items-center gap-1.5">
                        <span
                          key={resolved.username}
                          className="animate-amount-pop truncate text-xl font-bold tracking-tight sm:text-2xl motion-reduce:animate-none"
                        >
                          {formatRecipientLabel(
                            recipientKind === "email"
                              ? recipient
                              : resolved.username,
                            recipientKind
                          )}
                        </span>
                        <RecipientKindIcon
                          kind={recipientKind}
                          className="h-4 w-4 shrink-0 text-graphite"
                        />
                      </p>
                      <p
                        className="mt-0.5 truncate font-mono text-[11px] leading-snug text-graphite"
                        title={resolved.wallet}
                      >
                        {shortAddr(resolved.wallet)}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setResolved(null);
                        setAmount(null);
                        setAmountText("");
                        setError("");
                      }}
                      className="shrink-0 self-center rounded-full border border-fog bg-paper px-3 py-1.5 text-xs font-semibold text-graphite transition-all duration-200 hover:border-graphite hover:text-ink active:scale-95 disabled:opacity-50"
                    >
                      Change
                    </button>
                  </div>
                </div>

                <div
                  className="animate-soft-rise space-y-4 motion-reduce:animate-none"
                  style={{animationDelay: "120ms"}}
                >
                  <div className="flex items-end justify-between gap-3">
                    <FieldLabel>Amount</FieldLabel>
                    <p className="pb-0.5 font-mono text-[11px] text-graphite">
                      Up to {amountDecimals} decimals
                    </p>
                  </div>
                  <div className="rounded-2xl border border-fog bg-white px-4 py-5 transition-shadow duration-300 sm:px-5">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <button
                        type="button"
                        disabled={busy || (amount ?? 0) <= 0}
                        onClick={() => bumpAmount(-AMOUNT_STEP)}
                        aria-label="Decrease amount"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-fog bg-paper text-ink transition-all duration-200 hover:border-graphite hover:bg-white active:scale-90 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <MinusIcon className="h-5 w-5" />
                      </button>
                      <div className="min-w-0 flex-1 text-center">
                        <div className="flex items-baseline justify-center gap-2">
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0"
                            value={amountText}
                            disabled={busy}
                            onChange={(e) => onAmountTextChange(e.target.value)}
                            className="w-full min-w-0 bg-transparent text-center text-5xl font-bold tracking-tight tabular-nums text-ink outline-none transition-colors duration-200 placeholder:text-fog focus:text-ink disabled:opacity-50"
                            aria-label={`Amount in ${selectedToken.symbol}`}
                          />
                          <span
                            className={`shrink-0 text-lg font-semibold transition-colors duration-200 ${
                              amount != null ? "text-graphite" : "text-fog"
                            }`}
                          >
                            {selectedToken.symbol}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => bumpAmount(AMOUNT_STEP)}
                        aria-label="Increase amount"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-fog bg-paper text-ink transition-all duration-200 hover:border-graphite hover:bg-white active:scale-90 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <PlusIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <AmountPills
                    amounts={AMOUNT_PRESETS}
                    value={amount}
                    onChange={applyAmount}
                    disabled={busy}
                    canAfford={hasEnough}
                    symbol={selectedToken.symbol}
                  />
                </div>

                {amount != null && !hasEnough(amount) ? (
                  <p className="animate-fade text-sm text-amber motion-reduce:animate-none">
                    Not enough {selectedToken.symbol}. Balance {tokenBalance}.
                  </p>
                ) : null}

                <button
                  type="button"
                  disabled={
                    busy ||
                    amount == null ||
                    (amount != null && !hasEnough(amount))
                  }
                  onClick={handleSend}
                  className="btn-primary transition-transform duration-200 active:scale-[0.98]"
                >
                  {busy && !sendInFlight ? (
                    <LoaderIcon className="h-5 w-5 animate-spin" />
                  ) : null}
                  {stepLabel(step, amount, selectedToken.symbol)}
                </button>
                </div>
              </>
            )}
          </NetworkGate>
        )}

        {error && step !== "undelivered" && !sendInFlight ? (
          <ErrorBanner title={formatErrorTitle(error)} message={error} />
        ) : null}
      </Panel>
      </div>

      {showStatusModal ? (
        <PaymentStatusModal
          step={step}
          includeApprove={includeApprove}
          statusHint={statusHint}
          amount={sentAmount ?? amount}
          tokenSymbol={sentTokenSymbol || selectedToken.symbol}
          fromUsername={me?.username || ""}
          username={sentUsername || resolved?.username || ""}
          recipientKind={recipientKind}
          recipientInput={recipient}
          commitment={commitment}
          approveHash={approveHash}
          depositHash={txHash}
          error={error}
          retrying={retryingCommitment === commitment}
          onRetry={() => {
            const pending = pendingSends.find(
              (p) =>
                p.commitment.toLowerCase() === commitment.toLowerCase()
            );
            if (pending) void deliverPending(pending);
          }}
          onClose={
            step === "done" || step === "undelivered"
              ? resetAfterSuccess
              : undefined
          }
        />
      ) : null}
    </>
  );
}

function PendingDeliveriesPanel({
  items,
  retryingCommitment,
  onRetry,
}: {
  items: PendingSend[];
  retryingCommitment: string | null;
  onRetry: (p: PendingSend) => void;
}) {
  return (
    <Panel className="mb-4 space-y-3 text-left">
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-ink">
          Undelivered notes
        </h2>
        <p className="mt-1 text-xs text-graphite">
          Deposit succeeded on-chain, but the note never reached the inbox.
          Retry deliver — do not send a new payment.
        </p>
      </div>
      <ul className="space-y-2">
        {items.map((p) => {
          const busy = retryingCommitment === p.commitment;
          return (
            <li
              key={p.commitment}
              className="flex flex-col gap-2 rounded-xl border border-fog bg-paper/60 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">
                  {p.amount} {p.tokenSymbol} → @{p.recipientUsername}
                </p>
                <a
                  href={explorerTx(p.depositTxHash)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-0.5 inline-flex items-center gap-1 font-mono text-[11px] text-graphite hover:text-ink"
                >
                  {shortAddr(p.depositTxHash)}
                  <ExternalLinkIcon className="h-3 w-3" />
                </a>
              </div>
              <button
                type="button"
                className="btn-primary shrink-0 sm:w-auto"
                disabled={busy}
                onClick={() => onRetry(p)}
              >
                {busy ? <LoaderIcon className="h-4 w-4 animate-spin" /> : null}
                Retry deliver
              </button>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function PaymentStatusModal({
  step,
  includeApprove,
  statusHint,
  amount,
  tokenSymbol,
  fromUsername,
  username,
  recipientKind,
  recipientInput,
  commitment,
  approveHash,
  depositHash,
  error,
  retrying,
  onRetry,
  onClose,
}: {
  step: Step;
  includeApprove: boolean;
  statusHint: string;
  amount: number | null;
  tokenSymbol: string;
  fromUsername: string;
  username: string;
  recipientKind: Exclude<RecipientKind, "unknown">;
  recipientInput: string;
  commitment: string;
  approveHash: string;
  depositHash: string;
  error: string;
  retrying: boolean;
  onRetry: () => void;
  onClose?: () => void;
}) {
  const steps = flowSteps(includeApprove);
  const active = activeFlowId(step);
  const success = step === "done";
  const failed = step === "undelivered";
  const inFlight = !success && !failed;
  const activeIndex = steps.findIndex((s) => s.id === active);
  const progress =
    success || failed
      ? 1
      : activeIndex < 0
        ? 0
        : (activeIndex + 0.45) / steps.length;
  const tokenMeta = getPoolToken(tokenSymbol);
  const recipientLabel = formatRecipientLabel(
    recipientKind === "email" ? recipientInput : `@${username}`,
    recipientKind
  );
  const shareDetails: PaymentShareDetails = {
    fromUsername,
    toLabel: recipientLabel,
    amount: amount ?? "—",
    tokenSymbol,
    tokenLogo: tokenMeta?.logo,
  };
  const [shareBusy, setShareBusy] = useState<"copy" | "tweet" | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  async function onCopyImage() {
    setShareBusy("copy");
    try {
      await copyPaymentShareImage(shareDetails);
      toast.success("Share image copied. Paste it into X, Telegram, or Discord.");
    } catch {
      toast.error("Could not copy image. Try Share on X to download instead.");
    } finally {
      setShareBusy(null);
    }
  }

  async function onShareTwitter() {
    setShareBusy("tweet");
    try {
      const mode = await sharePaymentOnTwitter(shareDetails);
      toast.success(
        mode === "copied"
          ? "Image copied — paste it into your post on X."
          : "Image downloaded — attach it to your post on X."
      );
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setShareBusy(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-status-title"
    >
      <div
        className="absolute inset-0 bg-ink/50 backdrop-blur-md animate-fade motion-reduce:animate-none"
        aria-hidden
      />

      <div className="relative z-[1] flex max-h-[92dvh] w-full max-w-md animate-sheet-in flex-col overflow-y-auto rounded-t-3xl border border-fog bg-white shadow-[0_-12px_48px_-20px_rgba(10,10,10,0.35)] motion-reduce:animate-none sm:animate-rise sm:rounded-3xl sm:shadow-[0_28px_64px_-28px_rgba(10,10,10,0.4)]">
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-fog sm:hidden" />

        <div className="px-6 pb-2 pt-5 text-center sm:px-8 sm:pt-8">
          {success ? (
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-signal/10 text-signal animate-amount-pop motion-reduce:animate-none">
              <CheckIcon className="h-7 w-7" />
            </div>
          ) : null}

          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-graphite">
            {success ? "Sent" : failed ? "Action needed" : "Sending"}
          </p>

          <h2
            id="payment-status-title"
            className={`mt-2 font-bold tracking-tight text-ink ${
              success
                ? "animate-amount-pop text-4xl motion-reduce:animate-none sm:text-5xl"
                : "text-3xl sm:text-4xl"
            }`}
          >
            {amount != null ? amount : "—"}{" "}
            <span className="text-[0.55em] font-semibold text-graphite">
              {tokenSymbol}
            </span>
          </h2>

          <p className="mt-2 flex items-center justify-center gap-2 text-sm text-graphite">
            {tokenMeta?.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tokenMeta.logo}
                alt=""
                className="h-4 w-4 rounded-full"
              />
            ) : null}
            <span>to {recipientLabel}</span>
            <RecipientKindIcon kind={recipientKind} className="h-3.5 w-3.5" />
          </p>
        </div>

        {!success ? (
          <div className="px-6 pt-5 sm:px-8">
            <div className="h-1.5 overflow-hidden rounded-full bg-fog">
              <div
                className="h-full rounded-full bg-ink transition-[width] duration-500 ease-out"
                style={{width: `${Math.round(progress * 100)}%`}}
              />
            </div>
            <ol className="mt-3 flex justify-between gap-1">
              {steps.map((s, i) => {
                const done =
                  success ||
                  (failed && i < activeIndex) ||
                  (activeIndex >= 0 && i < activeIndex);
                const isActive = !success && !failed && s.id === active;
                return (
                  <li
                    key={s.id}
                    className={`min-w-0 flex-1 text-center font-mono text-[10px] tracking-wide ${
                      isActive
                        ? "font-semibold text-ink"
                        : done
                          ? "text-graphite"
                          : "text-graphite/45"
                    }`}
                  >
                    {s.label}
                  </li>
                );
              })}
            </ol>
          </div>
        ) : null}

        <div className="px-6 py-5 sm:px-8 sm:pb-6">
          {inFlight ? (
            <div className="flex items-start gap-3 rounded-2xl bg-paper px-4 py-3.5">
              <LoaderIcon className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-ink" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">
                  {statusHint || "Working…"}
                </p>
                {!includeApprove ? (
                  <p className="mt-1 text-xs text-graphite">
                    Allowance ready — deposit only.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {failed ? (
            <div className="space-y-3 rounded-2xl border border-amber/35 bg-amber/10 px-4 py-3.5">
              <p className="text-sm font-medium text-ink">
                Deposit landed. Note was not delivered.
              </p>
              <p className="text-xs leading-relaxed text-graphite">
                Retry delivery — do not send again. Your funds are already in
                the pool.
              </p>
              {error ? (
                <p className="font-mono text-[11px] text-graphite">{error}</p>
              ) : null}
            </div>
          ) : null}

          {success ? (
            <div className="space-y-4">
              <PaymentSharePreview details={shareDetails} />

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={shareBusy !== null}
                  onClick={() => void onCopyImage()}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-fog bg-paper px-3 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-graphite disabled:opacity-50"
                >
                  {shareBusy === "copy" ? (
                    <LoaderIcon className="h-4 w-4 animate-spin" />
                  ) : (
                    <CopyIcon className="h-4 w-4" />
                  )}
                  Copy image
                </button>
                <button
                  type="button"
                  disabled={shareBusy !== null}
                  onClick={() => void onShareTwitter()}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-3 py-2.5 text-sm font-semibold text-paper transition-transform duration-200 hover:bg-ink/90 active:scale-[0.98] disabled:opacity-50"
                >
                  {shareBusy === "tweet" ? (
                    <LoaderIcon className="h-4 w-4 animate-spin" />
                  ) : (
                    <XBrandIcon className="h-4 w-4" />
                  )}
                  Share on X
                </button>
              </div>

              <p className="text-center text-[11px] text-graphite">
                Tags{" "}
                <a
                  href="https://x.com/hushhprotocol"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-ink underline-offset-2 hover:underline"
                >
                  @hushhprotocol
                </a>{" "}
                · paste the image into your post
              </p>

              {(approveHash || depositHash) && (
                <div className="flex flex-wrap justify-center gap-2">
                  {approveHash ? (
                    <TxChip label="Approve" hash={approveHash} />
                  ) : null}
                  {depositHash ? (
                    <TxChip label="Deposit" hash={depositHash} />
                  ) : null}
                </div>
              )}

              {commitment ? (
                <p className="truncate text-center font-mono text-[10px] text-graphite/80">
                  {commitment}
                </p>
              ) : null}

              <button
                type="button"
                onClick={onClose}
                className="btn-primary w-full"
              >
                Done
              </button>
            </div>
          ) : null}

          {!success && (approveHash || depositHash) ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {approveHash ? (
                <TxChip label="Approve" hash={approveHash} />
              ) : null}
              {depositHash ? (
                <TxChip label="Deposit" hash={depositHash} />
              ) : null}
            </div>
          ) : null}

          {commitment && failed ? (
            <p className="mt-3 truncate text-center font-mono text-[10px] text-graphite/80">
              {commitment}
            </p>
          ) : null}

          {failed ? (
            <div className="mt-5 space-y-2">
              <button
                type="button"
                className="btn-primary w-full"
                disabled={retrying}
                onClick={onRetry}
              >
                {retrying ? (
                  <LoaderIcon className="h-5 w-5 animate-spin" />
                ) : null}
                Retry deliver
              </button>
              {onClose ? (
                <button
                  type="button"
                  className="btn-ghost w-full"
                  onClick={onClose}
                >
                  Close
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TxChip({label, hash}: {label: string; hash: string}) {
  return (
    <a
      href={explorerTx(hash)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-fog bg-paper px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-graphite"
    >
      <span className="text-graphite">{label}</span>
      <span className="font-mono">{shortAddr(hash)}</span>
      <ExternalLinkIcon className="h-3 w-3 text-graphite" />
    </a>
  );
}

function stepLabel(
  step: Step,
  amount: number | null,
  symbol: string
): string {
  switch (step) {
    case "creating":
    case "approving":
    case "depositing":
    case "posting":
      return "Sending…";
    case "undelivered":
      return "Retry deliver";
    default:
      return amount != null ? `Pay ${amount} ${symbol}` : "Select an amount";
  }
}

