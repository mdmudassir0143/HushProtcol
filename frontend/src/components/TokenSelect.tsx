"use client";

import {useEffect, useRef, useState} from "react";
import {useAccount} from "wagmi";
import {ChevronDownIcon, LoaderIcon} from "@/components/icons";
import {POOL_TOKENS, type PoolToken} from "@/lib/config";
import {useTokenBalance} from "@/hooks/useUsdcBalance";

function TokenLogo({
  token,
  size = 20,
  className = "",
}: {
  token: PoolToken;
  size?: number;
  className?: string;
}) {
  return (
    <img
      src={token.logo}
      alt=""
      width={size}
      height={size}
      draggable={false}
      className={`shrink-0 rounded-full ${className}`}
    />
  );
}

function TokenOptions({
  value,
  options,
  onChange,
  onClose,
}: {
  value: PoolToken;
  options: readonly PoolToken[];
  onChange: (token: PoolToken) => void;
  onClose: () => void;
}) {
  return (
    <ul
      role="listbox"
      aria-label="Pool tokens"
      className="menu-spring overflow-hidden rounded-2xl border border-fog/90 bg-white/95 p-1.5 shadow-[0_18px_40px_-20px_rgba(10,10,10,0.35)] backdrop-blur-xl"
    >
      {options.map((opt) => {
        const selected =
          opt.address.toLowerCase() === value.address.toLowerCase();
        return (
          <li key={opt.address} role="option" aria-selected={selected}>
            <button
              type="button"
              onClick={() => {
                onChange(opt);
                onClose();
              }}
              className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-sm transition-all duration-200 ${
                selected ? "bg-ink text-paper" : "text-ink hover:bg-paper"
              }`}
            >
              <TokenLogo token={opt} size={24} />
              <span className="min-w-0 flex-1 font-semibold">{opt.symbol}</span>
              <span
                className={`font-mono text-[10px] ${
                  selected ? "text-paper/70" : "text-graphite"
                }`}
              >
                {opt.decimals}d
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function useDismissible(
  open: boolean,
  root: React.RefObject<HTMLDivElement | null>,
  setOpen: (open: boolean) => void
) {
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
  }, [open, root, setOpen]);
}

/** Standalone pill dropdown. */
export function TokenSelect({
  value,
  onChange,
  disabled,
  className = "",
}: {
  value: PoolToken;
  onChange: (token: PoolToken) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const options = POOL_TOKENS.filter((t) => t.enabled);
  useDismissible(open, root, setOpen);

  return (
    <div ref={root} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select token"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex h-10 items-center gap-2 rounded-full border border-fog bg-white pl-2 pr-3.5 text-sm font-semibold text-ink transition-all duration-200 hover:border-graphite active:scale-95 disabled:opacity-50 ${
          open ? "border-ink" : ""
        }`}
      >
        <TokenLogo token={value} size={22} />
        <span className="tabular-nums">{value.symbol}</span>
        <ChevronDownIcon
          className={`h-3.5 w-3.5 text-graphite transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-2 min-w-[12.5rem]">
          <TokenOptions
            value={value}
            options={options}
            onChange={onChange}
            onClose={() => setOpen(false)}
          />
        </div>
      ) : null}
    </div>
  );
}

/** Single sleek card: embedded token dropdown + live balance. */
export function TokenBalanceSelect({
  value,
  onChange,
  disabled,
  className = "",
}: {
  value: PoolToken;
  onChange: (token: PoolToken) => void;
  disabled?: boolean;
  className?: string;
}) {
  const {isConnected} = useAccount();
  const {formatted, isLoading, isFetching, refetch} = useTokenBalance(value);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const options = POOL_TOKENS.filter((t) => t.enabled);
  useDismissible(open, root, setOpen);

  if (!isConnected) return null;

  return (
    <div
      ref={root}
      className={`relative overflow-visible rounded-2xl border border-fog bg-white ${className}`}
    >
      <div className="flex items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-5">
        <button
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label="Select token"
          onClick={() => setOpen((o) => !o)}
          className={`group flex shrink-0 items-center gap-2 rounded-full border bg-paper/90 py-1.5 pl-1.5 pr-2.5 transition-all duration-200 hover:border-graphite hover:bg-paper active:scale-[0.98] disabled:opacity-50 ${
            open ? "border-ink" : "border-fog"
          }`}
        >
          <TokenLogo token={value} size={28} />
          <span className="text-sm font-semibold tracking-tight text-ink">
            {value.symbol}
          </span>
          <ChevronDownIcon
            className={`h-3.5 w-3.5 text-graphite transition-transform duration-300 ${
              open ? "rotate-180" : "group-hover:translate-y-px"
            }`}
          />
        </button>

        <div className="min-w-0 flex-1 text-right">
          <div className="flex items-center justify-end gap-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-graphite">
              Balance
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="text-[11px] font-medium text-graphite transition-colors hover:text-ink disabled:opacity-50"
            >
              {isFetching ? "…" : "Refresh"}
            </button>
          </div>
          {isLoading ? (
            <div className="mt-0.5 flex items-center justify-end gap-2 text-sm text-graphite">
              <LoaderIcon className="h-3.5 w-3.5 animate-spin" />
              Loading…
            </div>
          ) : (
            <p className="mt-0.5 text-xl font-bold tracking-tight tabular-nums text-ink sm:text-2xl">
              {formatted}{" "}
              <span className="text-sm font-semibold text-graphite">
                {value.symbol}
              </span>
            </p>
          )}
        </div>
      </div>

      {open ? (
        <div className="absolute left-4 top-full z-30 mt-1.5 w-[min(100%-2rem,14rem)] sm:left-5">
          <TokenOptions
            value={value}
            options={options}
            onChange={onChange}
            onClose={() => setOpen(false)}
          />
        </div>
      ) : null}
    </div>
  );
}
