"use client";

import {useCallback, useEffect, useMemo, useState} from "react";
import {useAccount, useWriteContract} from "wagmi";
import {createPublicClient, http} from "viem";
import {noteFromJSON} from "@bullet/sdk";
import {bulletPoolAbi} from "@/abi/BulletPool";
import {claimNote, listNotes} from "@/lib/api";
import {
  addresses,
  arcTestnet,
  explorerTx,
  fromTokenUnits,
  resolvePoolToken,
} from "@/lib/config";
import {getOrCreateHushKeys, openPayload} from "@/lib/crypto";
import {getToken, getStoredUser} from "@/lib/session";
import {shortAddr} from "@/lib/address";
import {toast} from "@/lib/toast";
import {formatError, formatErrorTitle} from "@/lib/errors";
import {useSession} from "@/hooks/useSession";
import {
  claimStepLabel,
  prepareWithdraw,
  type ClaimStep,
} from "@/lib/withdraw";
import type {Note} from "@/shared";
import {ConnectButton} from "@/components/ConnectButton";
import {NetworkGate} from "@/components/NetworkGate";
import {PaymentShareSuccessModal} from "@/components/PaymentShareSuccessModal";
import {
  CheckIcon,
  ExternalLinkIcon,
  LoaderIcon,
} from "@/components/icons";
import {ErrorBanner, Panel} from "@/components/ui";
import type {PaymentShareDetails} from "@/lib/sharePayment";
import {
  encodeScratchClaimPayload,
  scratchClaimPath,
  type StoredPaymentPayload,
  parseStoredPaymentPayload,
} from "@/lib/scratchGift";

interface DecryptedRow {
  note: Note;
  payload: StoredPaymentPayload | null;
  error?: string;
}

type InboxTab = "unclaimed" | "gifts" | "claimed";

const CLAIM_TX_KEY = "hush.claimTxByNote";

function readClaimTxMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(CLAIM_TX_KEY) || "{}") as Record<
      string,
      string
    >;
  } catch {
    return {};
  }
}

function rememberClaimTx(noteId: string, txHash: string) {
  const map = readClaimTxMap();
  map[noteId] = txHash;
  localStorage.setItem(CLAIM_TX_KEY, JSON.stringify(map));
}

function txForNote(note: Note): string | undefined {
  if (note.claimTxHash) return note.claimTxHash;
  return readClaimTxMap()[note.id];
}

export function Inbox() {
  const {address, isConnected} = useAccount();
  const {writeContractAsync} = useWriteContract();
  const {isSignedIn, user: me, hasProfile} = useSession();
  const [rows, setRows] = useState<DecryptedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimStep, setClaimStep] = useState<ClaimStep>("idle");
  const [txHash, setTxHash] = useState("");
  const [tab, setTab] = useState<InboxTab>("unclaimed");
  const [shareSuccess, setShareSuccess] = useState<{
    details: PaymentShareDetails;
    txHash: string;
  } | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    const stored = getStoredUser();
    if (!token || !stored || !address) {
      setError("Sign in and connect the wallet linked to your account.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const notes = await listNotes(token);
      const keys = getOrCreateHushKeys(address);
      const localTx = readClaimTxMap();
      const decrypted: DecryptedRow[] = notes.map((note) => {
        const withTx = {
          ...note,
          claimTxHash: note.claimTxHash || localTx[note.id],
        };
        try {
          const plain = openPayload(note.encryptedPayload, keys.secretKey);
          const payload = parseStoredPaymentPayload(plain);
          noteFromJSON(payload.note);
          return {note: withTx, payload};
        } catch (e) {
          return {
            note: withTx,
            payload: null,
            error: formatError(e, "Could not decrypt this note."),
          };
        }
      });
      setRows(decrypted);
    } catch (e) {
      setError(formatError(e));
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (isConnected && isSignedIn) void load();
  }, [isConnected, isSignedIn, load]);

  const giftRows = useMemo(
    () =>
      rows.filter((r) => !r.note.claimed && r.payload?.kind === "scratch"),
    [rows]
  );
  const unclaimedRows = useMemo(
    () =>
      rows.filter((r) => !r.note.claimed && r.payload?.kind !== "scratch"),
    [rows]
  );
  const claimedRows = useMemo(
    () => rows.filter((r) => r.note.claimed),
    [rows]
  );
  const visibleRows =
    tab === "gifts"
      ? giftRows
      : tab === "unclaimed"
        ? unclaimedRows
        : claimedRows;

  async function handleClaim(row: DecryptedRow) {
    if (!address || !row.payload || row.note.claimed) return;
    const token = getToken();
    if (!token) {
      setError("Sign in first.");
      return;
    }

    setError("");
    setTxHash("");
    setClaimingId(row.note.id);
    setClaimStep("witness");

    try {
      const args = await prepareWithdraw({
        payload: row.payload.note,
        recipient: address,
        onStep: setClaimStep,
      });

      setClaimStep("withdrawing");
      const {pool} = addresses();
      const hash = await writeContractAsync({
        address: pool,
        abi: bulletPoolAbi,
        functionName: "withdraw",
        args: [
          args.proof,
          args.root,
          args.nullifier,
          args.recipientDigest,
          args.recipient,
          args.token,
          args.amount,
        ],
        chainId: arcTestnet.id,
      });

      const client = createPublicClient({
        chain: arcTestnet,
        transport: http(),
      });
      await client.waitForTransactionReceipt({hash});
      setTxHash(hash);

      setClaimStep("marking");
      await claimNote(token, row.note.id, hash);
      rememberClaimTx(row.note.id, hash);

      const tok = resolvePoolToken({
        tokenSymbol: row.note.tokenSymbol,
        tokenHash: row.payload.note.tokenHash,
      });
      const amountLabel = fromTokenUnits(row.payload.note.amount, tok.decimals);

      setClaimStep("done");
      setShareSuccess({
        details: {
          kind: "claimed",
          fromUsername: "",
          toLabel: me?.username ? `@${me.username}` : shortAddr(address),
          amount: amountLabel,
          tokenSymbol: tok.symbol,
          tokenLogo: tok.logo,
        },
        txHash: hash,
      });
      toast.success("Claimed. Tokens sent to your wallet.", {
        href: explorerTx(hash),
        hrefLabel: "View on explorer",
      });
      setRows((prev) =>
        prev.map((r) =>
          r.note.id === row.note.id
            ? {
                ...r,
                note: {...r.note, claimed: true, claimTxHash: hash},
              }
            : r
        )
      );
      setTab("claimed");
    } catch (e) {
      setClaimStep("error");
      const msg = formatError(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setClaimingId(null);
      setTimeout(() => setClaimStep("idle"), 800);
    }
  }

  if (!hasProfile && !isSignedIn) {
    return (
      <Panel className="space-y-4 text-center text-sm text-graphite">
        <p>Connect your wallet to load your account, then sign in.</p>
        {isConnected ? (
          <a href="/register" className="btn-primary">
            Sign in
          </a>
        ) : (
          <ConnectButton />
        )}
      </Panel>
    );
  }

  if (hasProfile && !isSignedIn) {
    return (
      <Panel className="space-y-4 text-center">
        <p className="text-sm text-graphite">
          Account @{me?.username} found. Sign in to decrypt your inbox.
        </p>
        <a href="/register" className="btn-primary">
          Sign in
        </a>
      </Panel>
    );
  }

  if (!isConnected) {
    return (
      <Panel className="space-y-4 text-center">
        <p className="text-sm text-graphite">
          Connect the wallet that owns your Hushh Protocol key to decrypt notes.
        </p>
        <ConnectButton label="Connect wallet" />
      </Panel>
    );
  }

  const busy = claimingId !== null;

  return (
    <NetworkGate>
      <div className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <p className="text-sm leading-relaxed text-graphite">
            Decrypt notes, then claim on Arc. Needs the indexer for a
            Merkle witness.
          </p>
          <button
            type="button"
            onClick={load}
            disabled={loading || busy}
            className="shrink-0 text-sm font-medium text-ink hover:underline disabled:opacity-50"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        <div
          role="tablist"
          aria-label="Inbox categories"
          className="inline-flex rounded-full border border-fog bg-white p-1"
        >
          {(
            [
              {
                id: "unclaimed" as const,
                label: "Unclaimed",
                count: unclaimedRows.length,
              },
              {
                id: "gifts" as const,
                label: "Gift cards",
                count: giftRows.length,
              },
              {
                id: "claimed" as const,
                label: "Claimed",
                count: claimedRows.length,
              },
            ]
          ).map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-ink text-paper"
                    : "text-graphite hover:text-ink"
                }`}
              >
                {t.label}
                <span
                  className={`ml-1.5 font-mono text-xs ${
                    active ? "text-paper/70" : "text-graphite/70"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {error ? (
          <ErrorBanner title={formatErrorTitle(error)} message={error} />
        ) : null}
        {txHash ? (
          <a
            href={explorerTx(txHash)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-fog bg-white px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-graphite"
          >
            Latest claim on explorer
            <ExternalLinkIcon className="h-3.5 w-3.5 text-graphite" />
          </a>
        ) : null}

        {loading && rows.length === 0 ? (
          <Panel className="flex justify-center py-10">
            <LoaderIcon className="h-6 w-6 animate-spin text-graphite" />
          </Panel>
        ) : null}

        {!loading && rows.length === 0 && !error ? (
          <Panel className="py-10 text-center text-sm text-graphite">
            No notes yet.
          </Panel>
        ) : null}

        {!loading && rows.length > 0 && visibleRows.length === 0 ? (
          <Panel className="py-10 text-center text-sm text-graphite">
            {tab === "unclaimed"
              ? "Nothing to claim."
              : tab === "gifts"
                ? "No scratch gift cards yet."
                : "No claimed notes yet."}
          </Panel>
        ) : null}

        <ul className="space-y-3">
          {visibleRows.map((row) => {
            const {note, payload, error: decErr} = row;
            const isThis = claimingId === note.id;
            const claimTx = txForNote(note);
            const scratchLink =
              payload?.kind === "scratch"
                ? scratchClaimPath(
                    encodeScratchClaimPayload({
                      ...payload.claim,
                      noteId: note.id,
                    })
                  )
                : null;
            return (
              <li key={note.id}>
                <Panel className="!p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      {payload ? (
                        <p className="text-2xl font-bold tracking-tight">
                          {(() => {
                            const tok = resolvePoolToken({
                              tokenSymbol: note.tokenSymbol,
                              tokenHash: payload.note.tokenHash,
                            });
                            return (
                              <>
                                {fromTokenUnits(payload.note.amount, tok.decimals)}{" "}
                                <span className="text-base font-semibold text-graphite">
                                  {tok.symbol}
                                </span>
                              </>
                            );
                          })()}
                        </p>
                      ) : (
                        <p className="text-sm text-graphite">Could not decrypt</p>
                      )}
                      {payload?.kind === "scratch" ? (
                        <p className="mt-2 inline-flex items-center rounded-full bg-paper px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-graphite">
                          {payload.claim.meta.title || "Scratch gift card"}
                        </p>
                      ) : null}
                      <p className="mt-2 truncate font-mono text-[11px] text-graphite">
                        {note.commitment}
                      </p>
                      {decErr ? (
                        <p className="mt-1 text-xs text-red-600">{decErr}</p>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                      {note.claimed ? (
                        <>
                          <span className="inline-flex items-center justify-center gap-1 font-mono text-[11px] font-medium text-signal">
                            <CheckIcon className="h-3.5 w-3.5" />
                            claimed
                          </span>
                          {claimTx ? (
                            <a
                              href={explorerTx(claimTx)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-ink/85"
                            >
                              View claim
                              <ExternalLinkIcon className="h-3.5 w-3.5" />
                            </a>
                          ) : null}
                        </>
                      ) : payload?.kind === "scratch" && scratchLink ? (
                        <a
                          href={scratchLink}
                          className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-ink/85"
                        >
                          Open scratch card
                        </a>
                      ) : payload ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleClaim(row)}
                          className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-ink/85 disabled:opacity-50"
                        >
                          {isThis ? (
                            <LoaderIcon className="h-4 w-4 animate-spin" />
                          ) : null}
                          {isThis ? claimStepLabel(claimStep) : "Claim"}
                        </button>
                      ) : (
                        <span className="font-mono text-[11px] text-graphite">
                          locked
                        </span>
                      )}
                    </div>
                  </div>
                </Panel>
              </li>
            );
          })}
        </ul>
      </div>

      {shareSuccess ? (
        <PaymentShareSuccessModal
          details={shareSuccess.details}
          depositHash={shareSuccess.txHash}
          onClose={() => setShareSuccess(null)}
        />
      ) : null}
    </NetworkGate>
  );
}
