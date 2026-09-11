"use client";

import {useState} from "react";
import {resolveUser} from "@/lib/api";
import {explorerAddress} from "@/lib/config";
import {formatError, formatErrorTitle} from "@/lib/errors";
import type {PublicUser} from "@/shared";
import {
  formatRecipientLabel,
  normalizeRecipient,
  RecipientKindIcon,
  type RecipientKind,
} from "@/components/RecipientKind";
import {RecipientKindSelect} from "@/components/RecipientKindSelect";
import {
  CheckIcon,
  ExternalLinkIcon,
  LoaderIcon,
} from "@/components/icons";
import {ErrorBanner, FieldLabel, Panel} from "@/components/ui";
import {UserAvatar} from "@/components/UserAvatar";
import {shortAddr} from "@/lib/address";

type Status = "idle" | "loading" | "found" | "missing" | "error";

export function LookoutForm() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<Exclude<RecipientKind, "unknown">>("twitter");
  const [status, setStatus] = useState<Status>("idle");
  const [user, setUser] = useState<PublicUser | null>(null);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState("");
  const [resultKey, setResultKey] = useState(0);

  async function lookup() {
    const raw = query.trim();
    if (!raw) return;
    setError("");
    setUser(null);
    setStatus("loading");
    setSearched(formatRecipientLabel(raw, kind));
    try {
      const profile = await resolveUser(normalizeRecipient(raw, kind));
      setResultKey((k) => k + 1);
      if (!profile) {
        setStatus("missing");
        return;
      }
      setUser(profile);
      setStatus("found");
    } catch (e) {
      setResultKey((k) => k + 1);
      setError(formatError(e));
      setStatus("error");
    }
  }

  return (
    <Panel className="space-y-6 text-left">
      <div className="space-y-3">
        <FieldLabel>Lookup</FieldLabel>
        <div className="input-shell">
          <RecipientKindSelect
            value={kind}
            onChange={(next) => {
              setKind(next);
              if (status !== "idle" && status !== "loading") setStatus("idle");
            }}
            disabled={status === "loading"}
            variant="inline"
          />
          <span className="input-shell-divider" aria-hidden />
          <input
            type="text"
            placeholder={kind === "email" ? "name@email.com" : "@username"}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value.trimStart());
              if (status !== "idle" && status !== "loading") setStatus("idle");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && query.trim()) void lookup();
            }}
            disabled={status === "loading"}
            autoComplete="off"
            spellCheck={false}
            className="input-shell-field"
          />
        </div>
        <p className="px-1 text-xs leading-relaxed text-graphite/80 transition-opacity duration-300">
          {kind === "email"
            ? "Search by email to see if it is claimed."
            : "Search by X username to see if it is claimed."}
        </p>
      </div>

      <button
        type="button"
        disabled={status === "loading" || !query.trim()}
        onClick={() => void lookup()}
        className="btn-primary"
      >
        {status === "loading" ? (
          <LoaderIcon className="h-5 w-5 animate-spin" />
        ) : null}
        {status === "loading" ? "Looking up…" : "Look up"}
      </button>

      {error ? (
        <div key={`err-${resultKey}`} className="sheet-spring">
          <ErrorBanner title={formatErrorTitle(error)} message={error} />
        </div>
      ) : null}

      {status === "found" && user ? (
        <div
          key={`found-${resultKey}`}
          className="sheet-spring space-y-5 rounded-2xl border border-fog bg-paper/50 p-5"
        >
          <div className="flex items-center gap-4">
            <UserAvatar address={user.wallet} size="lg" showName />
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-signal/10 px-3 py-1.5 text-signal">
                <CheckIcon className="h-4 w-4" />
                <p className="text-xs font-semibold tracking-wide">Claimed</p>
              </div>
              <p className="mt-3 flex items-center gap-2.5 text-3xl font-bold tracking-tight">
                <span
                  key={`${searched}-${kind}`}
                  className="animate-amount-pop truncate motion-reduce:animate-none"
                >
                  {formatRecipientLabel(
                    kind === "email" ? searched : user.username,
                    kind
                  )}
                </span>
                <RecipientKindIcon
                  kind={kind}
                  className="h-5 w-5 shrink-0 text-graphite"
                />
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-fog/80 bg-white/80 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-graphite">
              Resolved wallet
            </p>
            <p className="mt-2 font-mono text-sm leading-relaxed text-ink" title={user.wallet}>
              {shortAddr(user.wallet)}
            </p>
            <a
              href={explorerAddress(user.wallet)}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-ink transition-opacity hover:opacity-70"
            >
              View on arcscan
              <ExternalLinkIcon className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <a
              href={`/${encodeURIComponent(user.username)}`}
              className="btn-ghost transition-transform active:scale-[0.985]"
            >
              View profile
            </a>
            <a
              href={`/send?to=${encodeURIComponent(
                kind === "email" ? searched.replace(/^@/, "") : user.username
              )}`}
              className="btn-primary transition-transform active:scale-[0.985]"
            >
              Send to this user
            </a>
          </div>
        </div>
      ) : null}

      {status === "missing" ? (
        <div
          key={`missing-${resultKey}`}
          className="sheet-spring rounded-2xl border border-fog bg-paper/50 p-5"
        >
          <p className="text-sm font-semibold tracking-tight text-ink">
            Not claimed
          </p>
          <p className="mt-2 text-sm leading-relaxed text-graphite">
            <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
              <span className="animate-amount-pop motion-reduce:animate-none">
                {searched}
              </span>
              <RecipientKindIcon kind={kind} className="h-3.5 w-3.5" />
            </span>{" "}
            is not registered on Hushh Protocol yet. No wallet is linked.
          </p>
        </div>
      ) : null}

      {status === "idle" && !query ? (
        <div className="rounded-[1.35rem] border border-dashed border-fog px-5 py-8 text-center">
          <p className="text-sm text-graphite">
            Enter a handle or email to check claim status.
          </p>
        </div>
      ) : null}
    </Panel>
  );
}
