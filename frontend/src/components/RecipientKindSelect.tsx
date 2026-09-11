"use client";

import {useEffect, useRef, useState} from "react";
import {ChevronDownIcon, MailIcon, XBrandIcon} from "@/components/icons";
import type {RecipientKind} from "@/components/RecipientKind";
import {RecipientKindIcon} from "@/components/RecipientKind";

const OPTIONS: Array<Exclude<RecipientKind, "unknown">> = ["twitter", "email"];

export function RecipientKindSelect({
  value,
  onChange,
  disabled,
  className = "",
  variant = "default",
}: {
  value: Exclude<RecipientKind, "unknown">;
  onChange: (kind: Exclude<RecipientKind, "unknown">) => void;
  disabled?: boolean;
  className?: string;
  /** `inline` sits inside a text field with no outer chrome. */
  variant?: "default" | "inline";
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const triggerClass =
    variant === "inline"
      ? `inline-flex h-11 items-center gap-1 rounded-[0.9rem] px-2.5 text-ink transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-paper active:scale-95 disabled:opacity-50 ${
          open ? "bg-paper" : ""
        }`
      : "inline-flex h-9 items-center gap-1 rounded-full border border-fog bg-white px-2.5 text-ink transition-all duration-200 hover:border-graphite active:scale-95 disabled:opacity-50";

  return (
    <div ref={root} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={value === "email" ? "Email" : "X username"}
        title={value === "email" ? "Email" : "X username"}
        onClick={() => setOpen((o) => !o)}
        className={triggerClass}
      >
        <span
          key={value}
          className="inline-flex animate-amount-pop motion-reduce:animate-none"
        >
          <RecipientKindIcon kind={value} className="h-5 w-5" />
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 text-graphite transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label="Recipient type"
          className="menu-spring absolute left-0 z-20 mt-2 flex flex-col gap-0.5 rounded-2xl border border-fog/90 bg-white/95 p-1.5 shadow-[0_18px_40px_-20px_rgba(10,10,10,0.35)] backdrop-blur-xl"
        >
          {OPTIONS.map((opt) => {
            const selected = value === opt;
            return (
              <li key={opt} role="option" aria-selected={selected}>
                <button
                  type="button"
                  title={opt === "email" ? "Email" : "X username"}
                  aria-label={opt === "email" ? "Email" : "X username"}
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-90 ${
                    selected
                      ? "bg-ink text-paper shadow-sm"
                      : "text-ink hover:bg-paper"
                  }`}
                >
                  {opt === "email" ? (
                    <MailIcon className="h-4 w-4" />
                  ) : (
                    <XBrandIcon className="h-4 w-4" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
