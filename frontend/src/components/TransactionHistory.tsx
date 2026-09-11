"use client";

import {useCallback, useEffect, useState} from "react";
import {listNoteHistory} from "@/lib/api";
import {explorerTx} from "@/lib/config";
import {getToken} from "@/lib/session";
import {useSession} from "@/hooks/useSession";
import {formatError} from "@/lib/errors";
import type {NoteHistoryItem} from "@/shared";
import {ExternalLinkIcon, LoaderIcon} from "@/components/icons";
import {FieldLabel} from "@/components/ui";

const PAGE_SIZE = 5;

type Direction = "sent" | "received";

function shortTx(hash: string): string {
  if (hash.length < 14) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

function atName(name?: string): string {
  if (!name) return "—";
  return name.startsWith("@") ? name : `@${name}`;
}

export function TransactionHistory() {
  const {isSignedIn, user} = useSession();
  const [direction, setDirection] = useState<Direction>("sent");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<NoteHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const token = getToken();
    if (!token || !isSignedIn) {
      setItems([]);
      setTotal(0);
      setTotalPages(1);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await listNoteHistory(token, {
        direction,
        page,
        limit: PAGE_SIZE,
      });
      setItems(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (e) {
      setError(formatError(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [direction, page, isSignedIn]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [direction]);

  if (!isSignedIn) return null;

  const me = user?.username;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <FieldLabel>Transaction history</FieldLabel>
        <p className="pb-0.5 font-mono text-[11px] text-graphite">
          {total} total
        </p>
      </div>

      <div
        role="tablist"
        aria-label="History direction"
        className="flex rounded-2xl border border-fog bg-paper/70 p-1"
      >
        {(
          [
            {id: "sent" as const, label: "Sent"},
            {id: "received" as const, label: "Received"},
          ] as const
        ).map((tab) => {
          const on = direction === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setDirection(tab.id)}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200 ${
                on
                  ? "bg-ink text-paper shadow-[0_1px_2px_rgba(10,10,10,0.18)]"
                  : "text-graphite hover:bg-white/80 hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-fog bg-white">
        {loading ? (
          <div className="flex justify-center py-10">
            <LoaderIcon className="h-5 w-5 animate-spin text-graphite" />
          </div>
        ) : error ? (
          <p className="px-4 py-6 text-center text-sm text-graphite">{error}</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-graphite">
            {direction === "sent"
              ? "No sends yet. Pay someone from Send."
              : "No received notes yet."}
          </p>
        ) : (
          <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-fog bg-paper/60 text-[10px] font-semibold uppercase tracking-[0.14em] text-graphite">
                <th className="px-4 py-3 font-semibold">From</th>
                <th className="px-4 py-3 font-semibold">To</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Tx hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fog">
              {items.map((item) => {
                const from =
                  item.fromUsername ||
                  (item.direction === "sent" ? me : undefined);
                const to =
                  item.toUsername ||
                  (item.direction === "received" ? me : undefined);
                const tx =
                  item.direction === "sent"
                    ? item.depositTxHash
                    : item.claimTxHash || item.depositTxHash;

                return (
                  <tr key={item.id} className="align-middle hover:bg-paper/40">
                    <td className="px-4 py-3.5 font-semibold tracking-tight text-ink">
                      {atName(from)}
                    </td>
                    <td className="px-4 py-3.5 font-semibold tracking-tight text-ink">
                      {atName(to)}
                    </td>
                    <td className="px-4 py-3.5 font-bold tabular-nums text-ink">
                      {item.amount != null
                        ? `${item.amount} ${item.tokenSymbol ?? "USDC"}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          item.claimed
                            ? "bg-signal/10 text-signal"
                            : "bg-amber/15 text-ink"
                        }`}
                      >
                        {item.claimed ? "Claimed" : "Open"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {tx ? (
                        <a
                          href={explorerTx(tx)}
                          target="_blank"
                          rel="noreferrer"
                          title={tx}
                          className="inline-flex items-center gap-1.5 font-mono text-xs text-ink underline-offset-2 hover:underline"
                        >
                          {shortTx(tx)}
                          <ExternalLinkIcon className="h-3 w-3 shrink-0 text-graphite" />
                        </a>
                      ) : (
                        <span className="font-mono text-xs text-graphite">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={loading || page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-full border border-fog bg-white px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-graphite disabled:cursor-not-allowed disabled:opacity-35"
          >
            Previous
          </button>
          <p className="font-mono text-[11px] text-graphite">
            Page {page} / {totalPages}
          </p>
          <button
            type="button"
            disabled={loading || page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-full border border-fog bg-white px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-graphite disabled:cursor-not-allowed disabled:opacity-35"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** @deprecated Use TransactionHistory */
export function SendHistory() {
  return <TransactionHistory />;
}
