"use client";

import {useEffect, useState} from "react";
import {explorerTx} from "@/lib/config";
import {shortAddr} from "@/lib/address";
import {toast} from "@/lib/toast";
import {formatError} from "@/lib/errors";
import {
  copyPaymentShareImage,
  sharePaymentOnTwitter,
  type PaymentShareDetails,
} from "@/lib/sharePayment";
import {PaymentSharePreview} from "@/components/PaymentSharePreview";
import {
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  LoaderIcon,
  XBrandIcon,
} from "@/components/icons";

type Props = {
  details: PaymentShareDetails;
  depositHash?: string;
  txLabel?: string;
  onClose: () => void;
};

export function PaymentShareSuccessModal({
  details,
  depositHash,
  txLabel,
  onClose,
}: Props) {
  const [shareBusy, setShareBusy] = useState<"copy" | "tweet" | null>(null);
  const claimed = details.kind === "claimed";
  const statusLabel = claimed ? "Claimed" : "Sent";
  const chipLabel = txLabel ?? (claimed ? "Claim" : "Deposit");

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
      await copyPaymentShareImage(details);
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
      const mode = await sharePaymentOnTwitter(details);
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
      aria-labelledby="payment-share-success-title"
    >
      <div
        className="absolute inset-0 bg-ink/50 backdrop-blur-md animate-fade motion-reduce:animate-none"
        aria-hidden
        onClick={onClose}
      />

      <div className="relative z-[1] flex max-h-[92dvh] w-full max-w-md animate-sheet-in flex-col overflow-y-auto rounded-t-3xl border border-fog bg-white shadow-[0_-12px_48px_-20px_rgba(10,10,10,0.35)] motion-reduce:animate-none sm:animate-rise sm:rounded-3xl sm:shadow-[0_28px_64px_-28px_rgba(10,10,10,0.4)]">
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-fog sm:hidden" />

        <div className="px-6 pb-2 pt-5 text-center sm:px-8 sm:pt-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-signal/10 text-signal animate-amount-pop motion-reduce:animate-none">
            <CheckIcon className="h-7 w-7" />
          </div>

          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-graphite">
            {statusLabel}
          </p>

          <h2
            id="payment-share-success-title"
            className="mt-2 animate-amount-pop text-4xl font-bold tracking-tight text-ink motion-reduce:animate-none sm:text-5xl"
          >
            {details.amount}{" "}
            <span className="text-[0.55em] font-semibold text-graphite">
              {details.tokenSymbol}
            </span>
          </h2>

          <p className="mt-2 flex items-center justify-center gap-2 text-sm text-graphite">
            {details.tokenLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={details.tokenLogo}
                alt=""
                className="h-4 w-4 rounded-full"
              />
            ) : null}
            <span>to {details.toLabel}</span>
          </p>
        </div>

        <div className="space-y-4 px-6 py-5 sm:px-8 sm:pb-6">
          <PaymentSharePreview details={details} />

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

          {depositHash ? (
            <div className="flex flex-wrap justify-center gap-2">
              <a
                href={explorerTx(depositHash)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-fog bg-paper px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-graphite"
              >
                <span className="text-graphite">{chipLabel}</span>
                <span className="font-mono">{shortAddr(depositHash)}</span>
                <ExternalLinkIcon className="h-3 w-3 text-graphite" />
              </a>
            </div>
          ) : null}

          <button type="button" onClick={onClose} className="btn-primary w-full">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
