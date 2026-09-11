import type {ReactNode} from "react";
import {AlertCircleIcon} from "@/components/icons";

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`panel p-5 sm:p-7 ${className}`}>{children}</div>
  );
}

export function PageHeader({
  title,
  subtitle,
  align = "left",
}: {
  title: string;
  subtitle?: string;
  align?: "left" | "center";
}) {
  return (
    <header
      className={`mb-7 space-y-2 sm:mb-8 ${align === "center" ? "text-center" : "text-left"}`}
    >
      <h1 className="text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
        {title}
      </h1>
      {subtitle ? (
        <p className="text-sm leading-relaxed text-graphite sm:text-base">
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}

export function FieldLabel({children}: {children: ReactNode}) {
  return (
    <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-graphite">
      {children}
    </p>
  );
}

export function ErrorBanner({
  message,
  title = "Error",
}: {
  message: string;
  title?: string;
}) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex gap-3 rounded-xl border border-red-200/90 bg-red-50/90 px-4 py-3 text-left"
    >
      <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-medium text-red-800">{title}</p>
        <p className="break-words text-sm leading-relaxed text-red-700/90">
          {message}
        </p>
      </div>
    </div>
  );
}

export function WarnBanner({children}: {children: ReactNode}) {
  return (
    <p className="rounded-xl border border-amber/40 bg-amber/10 px-3 py-2 text-sm text-ink">
      {children}
    </p>
  );
}

export function AmountPills({
  amounts,
  value,
  onChange,
  disabled,
  canAfford,
  symbol = "USDC",
}: {
  amounts: readonly number[];
  value: number | null;
  onChange: (n: number) => void;
  disabled?: boolean;
  /** When false, pill is disabled (e.g. balance too low). */
  canAfford?: (amount: number) => boolean;
  symbol?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Amount"
      className="flex rounded-2xl border border-fog bg-paper/70 p-1"
    >
      {amounts.map((a) => {
        const selected = value != null && Math.abs(value - a) < 1e-9;
        const affordable = canAfford ? canAfford(a) : true;
        const locked = disabled || !affordable;
        return (
          <button
            key={a}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={locked}
            onClick={() => onChange(a)}
            title={!affordable ? `Insufficient ${symbol} balance` : undefined}
            className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2.5 text-center transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 disabled:cursor-not-allowed disabled:opacity-35 ${
              selected
                ? "bg-ink text-paper shadow-[0_1px_2px_rgba(10,10,10,0.18)]"
                : "bg-transparent text-graphite hover:bg-white/80 hover:text-ink"
            }`}
          >
            <span className="text-base font-bold tracking-tight tabular-nums sm:text-lg">
              {a}
            </span>
            <span
              className={`text-[10px] font-medium uppercase tracking-[0.12em] ${
                selected ? "text-paper/65" : "text-graphite/70"
              }`}
            >
              {symbol}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function PayProgress({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  return (
    <ol className="flex items-center gap-1.5">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div
              className={`h-1 rounded-full transition-colors duration-300 ${
                done || active ? "bg-ink" : "bg-fog"
              }`}
            />
            <span
              className={`truncate font-mono text-[10px] tracking-wide ${
                active
                  ? "text-ink"
                  : done
                    ? "text-graphite"
                    : "text-graphite/50"
              }`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function Shell({
  children,
  narrow = true,
}: {
  children: ReactNode;
  narrow?: boolean;
}) {
  return (
    <div
      className={`animate-fade mx-auto w-full ${narrow ? "max-w-2xl" : "max-w-3xl"}`}
    >
      {children}
    </div>
  );
}
