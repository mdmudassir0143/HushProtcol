import {formatError} from "@/lib/errors";

export type ToastKind = "success" | "error" | "info";

export interface ToastPayload {
  id: string;
  kind: ToastKind;
  message: string;
  durationMs?: number;
  /** Optional explorer (or other) URL shown as an icon link. */
  href?: string;
  hrefLabel?: string;
}

export const TOAST_EVENT = "hush:toast";

export type ToastOptions = {
  durationMs?: number;
  href?: string;
  hrefLabel?: string;
};

function emit(
  kind: ToastKind,
  message: string,
  opts?: number | ToastOptions
) {
  if (typeof window === "undefined") return;
  const options = typeof opts === "number" ? {durationMs: opts} : opts ?? {};
  const payload: ToastPayload = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    message,
    durationMs: options.durationMs,
    href: options.href,
    hrefLabel: options.hrefLabel,
  };
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, {detail: payload}));
}

export const toast = {
  success: (message: string, opts?: number | ToastOptions) =>
    emit("success", message, opts),
  error: (err: unknown, opts?: number | ToastOptions) =>
    emit(
      "error",
      formatError(err),
      typeof opts === "number" ? opts : {...opts, durationMs: opts?.durationMs ?? 5200}
    ),
  info: (message: string, opts?: number | ToastOptions) =>
    emit("info", message, opts),
};
