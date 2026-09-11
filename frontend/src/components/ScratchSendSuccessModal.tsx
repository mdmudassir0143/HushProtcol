"use client";

import {useEffect, useState} from "react";
import {explorerTx} from "@/lib/config";
import {shortAddr} from "@/lib/address";
import {toast} from "@/lib/toast";
import type {ScratchTheme} from "@/lib/scratchGift";
import {ScratchRevealCard} from "@/components/ScratchRevealCard";
import {CheckIcon, CopyIcon, ExternalLinkIcon} from "@/components/icons";

type Props = {
  title: string;
  theme: ScratchTheme;
  amountLabel: string;
  tokenSymbol: string;
  recipientUsername: string;
  claimUrl: string;
  depositHash?: string;
  onClose: () => void;
};

function shortenUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = `${u.pathname}${u.search}`;
    if (path.length <= 28) return `${u.host}${path}`;
    return `${u.host}${path.slice(0, 14)}…${path.slice(-10)}`;
  } catch {
    return url.length > 36 ? `${url.slice(0, 18)}…${url.slice(-12)}` : url;
  }
}

export function ScratchSendSuccessModal({
  title,
  theme,
  amountLabel,
  tokenSymbol,
  recipientUsername,
  claimUrl,
  depositHash,
  onClose,
}: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(claimUrl);
      setCopied(true);
      toast.success("Gift claim link copied.");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn’t copy link.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scratch-send-success-title"
    >
      <div
        className="absolute inset-0 bg-ink/60 backdrop-blur-md animate-fade motion-reduce:animate-none"
        aria-hidden
        onClick={onClose}
      />

      <div className="relative z-[1] flex max-h-[92dvh] w-full max-w-[26rem] animate-sheet-in flex-col overflow-hidden rounded-t-[1.75rem] border border-fog bg-white shadow-[0_-12px_48px_-20px_rgba(10,10,10,0.35)] motion-reduce:animate-none sm:animate-rise sm:rounded-[1.75rem] sm:shadow-[0_28px_64px_-28px_rgba(10,10,10,0.45)]">
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-white/25 sm:hidden" />

        {/* Ticket hero — full-bleed dark stage */}
        <div className="relative shrink-0 overflow-hidden bg-[#0a0a0a] px-6 pb-9 pt-7 sm:px-8 sm:pb-11 sm:pt-9">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[48%] opacity-[0.22] contrast-125 grayscale"
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
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black to-transparent" />

          <div className="absolute left-1/2 top-5 z-[2] flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-ink shadow-[0_10px_28px_-12px_rgba(0,0,0,0.65)] animate-amount-pop motion-reduce:animate-none">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-signal/15 text-signal">
              <CheckIcon className="h-3.5 w-3.5" />
            </span>
            Gift card sent
          </div>

          <div className="relative mt-9 px-1 animate-soft-rise motion-reduce:animate-none sm:mt-10">
            <ScratchRevealCard
              meta={{title, theme}}
              amountLabel={amountLabel}
              tokenSymbol={tokenSymbol}
              recipientLabel={`@${recipientUsername}`}
              revealed
              tilt
            />
          </div>
        </div>

        {/* Actions */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6 sm:pb-6">
          <div className="text-center">
            <h2
              id="scratch-send-success-title"
              className="animate-amount-pop text-[2rem] font-bold tracking-tight text-ink motion-reduce:animate-none sm:text-[2.35rem]"
            >
              {amountLabel}{" "}
              <span className="text-[0.55em] font-semibold text-graphite">
                {tokenSymbol}
              </span>
            </h2>
            <p className="mt-1.5 text-sm text-graphite">
              On the way to{" "}
              <span className="font-semibold text-ink">
                @{recipientUsername}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => void copyLink()}
            className="btn-primary w-full"
          >
            {copied ? (
              <CheckIcon className="h-4 w-4 text-signal" />
            ) : (
              <CopyIcon className="h-4 w-4" />
            )}
            {copied ? "Link copied" : "Copy claim link"}
          </button>

          <div className="rounded-2xl border border-fog bg-paper/80 px-3.5 py-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-graphite">
              Claim link
            </p>
            <p
              className="mt-1 truncate font-mono text-[11px] text-ink"
              title={claimUrl}
            >
              {shortenUrl(claimUrl)}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-graphite">
              Also lands in their Inbox under Gift cards.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <a
              href={claimUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-fog bg-paper px-3 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-graphite"
            >
              Preview
              <ExternalLinkIcon className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-full bg-ink px-3 py-2.5 text-sm font-semibold text-paper transition-transform duration-200 hover:bg-ink/90 active:scale-[0.98]"
            >
              Done
            </button>
          </div>

          {depositHash ? (
            <div className="flex justify-center pb-1">
              <a
                href={explorerTx(depositHash)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-fog bg-paper px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-graphite"
              >
                <span className="text-graphite">Deposit</span>
                <span className="font-mono">{shortAddr(depositHash)}</span>
                <ExternalLinkIcon className="h-3 w-3 text-graphite" />
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
