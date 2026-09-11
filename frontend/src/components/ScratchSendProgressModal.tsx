"use client";

import {useEffect} from "react";
import type {ScratchTheme} from "@/lib/scratchGift";
import {ScratchRevealCard} from "@/components/ScratchRevealCard";
import {LoaderIcon} from "@/components/icons";

type FlowStepId = "lookup" | "note" | "approve" | "deposit" | "deliver";

type Step =
  | "resolving"
  | "creating"
  | "approving"
  | "depositing"
  | "posting";

const THEME_GLOW: Record<ScratchTheme, string> = {
  crimson: "from-[#f07a1a]/25 via-transparent to-transparent",
  azure: "from-[#2f6fed]/25 via-transparent to-transparent",
  emerald: "from-[#0f9f6e]/25 via-transparent to-transparent",
};

function flowSteps(includeApprove: boolean): {id: FlowStepId; label: string}[] {
  if (includeApprove) {
    return [
      {id: "lookup", label: "Lookup"},
      {id: "note", label: "Note"},
      {id: "approve", label: "Approve"},
      {id: "deposit", label: "Deposit"},
      {id: "deliver", label: "Deliver"},
    ];
  }
  return [
    {id: "lookup", label: "Lookup"},
    {id: "note", label: "Note"},
    {id: "deposit", label: "Deposit"},
    {id: "deliver", label: "Deliver"},
  ];
}

function activeFlowId(step: Step): FlowStepId {
  switch (step) {
    case "resolving":
      return "lookup";
    case "creating":
      return "note";
    case "approving":
      return "approve";
    case "depositing":
      return "deposit";
    case "posting":
      return "deliver";
  }
}

type Props = {
  step: Step;
  includeApprove: boolean;
  statusHint: string;
  title: string;
  theme: ScratchTheme;
  amountLabel: string;
  tokenSymbol: string;
  recipientUsername: string;
};

export function ScratchSendProgressModal({
  step,
  includeApprove,
  statusHint,
  title,
  theme,
  amountLabel,
  tokenSymbol,
  recipientUsername,
}: Props) {
  const steps = flowSteps(includeApprove);
  const active = activeFlowId(step);
  const activeIndex = steps.findIndex((s) => s.id === active);
  const progress =
    activeIndex < 0 ? 0.12 : (activeIndex + 0.55) / steps.length;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scratch-send-progress-title"
      aria-busy="true"
    >
      <div
        className="absolute inset-0 bg-ink/55 backdrop-blur-md animate-fade motion-reduce:animate-none"
        aria-hidden
      />

      <div className="relative z-[1] flex max-h-[92dvh] w-full max-w-md animate-sheet-in flex-col overflow-y-auto rounded-t-3xl border border-fog bg-white shadow-[0_-12px_48px_-20px_rgba(10,10,10,0.35)] motion-reduce:animate-none sm:animate-rise sm:rounded-3xl sm:shadow-[0_28px_64px_-28px_rgba(10,10,10,0.4)]">
        <div
          className={`pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b ${THEME_GLOW[theme]}`}
          aria-hidden
        />
        <div className="relative mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-fog sm:hidden" />

        <div className="relative px-6 pb-2 pt-5 text-center sm:px-8 sm:pt-8">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-graphite">
            Creating gift card
          </p>
          <h2
            id="scratch-send-progress-title"
            className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl"
          >
            {amountLabel}{" "}
            <span className="text-[0.55em] font-semibold text-graphite">
              {tokenSymbol}
            </span>
          </h2>
          <p className="mt-2 text-sm text-graphite">
            to @{recipientUsername || "…"}
          </p>
        </div>

        <div className="relative px-6 pt-4 sm:px-8">
          <div className="h-1.5 overflow-hidden rounded-full bg-fog">
            <div
              className="h-full rounded-full bg-ink transition-[width] duration-500 ease-out"
              style={{width: `${Math.round(progress * 100)}%`}}
            />
          </div>
          <ol className="mt-3 flex justify-between gap-1">
            {steps.map((s, i) => {
              const done = activeIndex >= 0 && i < activeIndex;
              const isActive = s.id === active;
              return (
                <li
                  key={s.id}
                  className={`min-w-0 flex-1 text-center font-mono text-[10px] tracking-wide ${
                    isActive
                      ? "font-semibold text-ink"
                      : done
                        ? "text-graphite"
                        : "text-graphite/45"
                  }`}
                >
                  {s.label}
                </li>
              );
            })}
          </ol>
        </div>

        <div className="relative space-y-4 px-6 py-5 sm:px-8 sm:pb-7">
          <ScratchRevealCard
            meta={{title, theme}}
            amountLabel={amountLabel}
            tokenSymbol={tokenSymbol}
            recipientLabel={
              recipientUsername ? `@${recipientUsername}` : undefined
            }
            disabled
            tilt
            stage
            className="animate-soft-rise motion-reduce:animate-none"
          />

          <div className="flex items-start gap-3 rounded-2xl bg-paper px-4 py-3.5">
            <LoaderIcon className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-ink" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">
                {statusHint || "Working…"}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-graphite">
                Keep this window open until the gift lands in their inbox.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
