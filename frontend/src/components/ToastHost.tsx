"use client";

import {useEffect, useState} from "react";
import {
  AlertCircleIcon,
  CheckIcon,
  ExternalLinkIcon,
} from "@/components/icons";
import {TOAST_EVENT, type ToastPayload} from "@/lib/toast";

function ToastIcon({kind}: {kind: ToastPayload["kind"]}) {
  if (kind === "success") {
    return <CheckIcon className="h-4 w-4 shrink-0 text-signal" />;
  }
  if (kind === "error") {
    return <AlertCircleIcon className="h-4 w-4 shrink-0 text-red-600" />;
  }
  return (
    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink" aria-hidden />
  );
}

export function ToastHost() {
  const [items, setItems] = useState<ToastPayload[]>([]);

  useEffect(() => {
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<ToastPayload>).detail;
      if (!detail?.message) return;
      setItems((prev) => [...prev.slice(-4), detail]);
      const ms = detail.durationMs ?? (detail.href ? 6500 : 3800);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== detail.id));
      }, ms);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex flex-col items-center gap-2 px-4"
      aria-live="polite"
    >
      {items.map((t) => (
        <div
          key={t.id}
          className={`toast-enter pointer-events-auto flex max-w-md items-start gap-2.5 rounded-2xl border bg-white/95 px-4 py-3 text-sm shadow-lg shadow-ink/10 backdrop-blur-md ${
            t.kind === "error" ? "border-red-200" : "border-fog"
          }`}
        >
          <ToastIcon kind={t.kind} />
          <div className="min-w-0 flex-1">
            <p className="leading-snug text-ink">{t.message}</p>
            {t.href ? (
              <a
                href={t.href}
                target="_blank"
                rel="noreferrer"
                className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-ink underline-offset-2 hover:underline"
              >
                {t.hrefLabel ?? "View on explorer"}
                <ExternalLinkIcon className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>
          <button
            type="button"
            className="shrink-0 text-xs text-graphite hover:text-ink"
            onClick={() =>
              setItems((prev) => prev.filter((x) => x.id !== t.id))
            }
          >
            Close
          </button>
        </div>
      ))}
    </div>
  );
}
