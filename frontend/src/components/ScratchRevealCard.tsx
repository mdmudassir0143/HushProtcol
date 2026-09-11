"use client";

import {useEffect, useMemo, useRef, useState} from "react";
import type {ScratchGiftMeta, ScratchTheme} from "@/lib/scratchGift";

const THEME: Record<
  ScratchTheme,
  {
    paper: string;
    stage: string;
  }
> = {
  crimson: {
    paper: "#f07a1a",
    stage: "bg-[#0a0a0a]",
  },
  azure: {
    paper: "#2f6fed",
    stage: "bg-[#061018]",
  },
  emerald: {
    paper: "#0f9f6e",
    stage: "bg-[#04140f]",
  },
};

type Props = {
  meta: ScratchGiftMeta;
  amountLabel: string;
  tokenSymbol: string;
  recipientLabel?: string;
  onThreshold?: () => void;
  /** Preview / non-interactive foil. */
  disabled?: boolean;
  /** Force fully revealed prize (success screen). */
  revealed?: boolean;
  /** Slight diagonal toss like the reference cover. */
  tilt?: boolean;
  /** Wrap ticket on a dark stage (compose / success). */
  stage?: boolean;
  className?: string;
};

function ticketSerial(seed: string): string {
  let n = 0;
  for (let i = 0; i < seed.length; i++) n = (n * 31 + seed.charCodeAt(i)) >>> 0;
  return String(100000 + (n % 900000));
}

function PunchColumn() {
  return (
    <div
      aria-hidden
      className="flex flex-col items-center justify-center gap-[0.55rem] px-1.5 sm:gap-2.5 sm:px-2"
    >
      {Array.from({length: 5}).map((_, i) => (
        <span
          key={i}
          className="h-[0.55rem] w-[0.55rem] rounded-full bg-black sm:h-2.5 sm:w-2.5"
        />
      ))}
    </div>
  );
}

function SerialRail({value}: {value: string}) {
  return (
    <div
      aria-hidden
      className="flex w-5 shrink-0 items-center justify-center border-x border-black/80 sm:w-6"
    >
      <span className="rotate-180 font-mono text-[9px] font-bold tracking-[0.22em] text-black [writing-mode:vertical-rl] sm:text-[10px]">
        {value}
      </span>
    </div>
  );
}

export function ScratchRevealCard({
  meta,
  amountLabel,
  tokenSymbol,
  recipientLabel,
  onThreshold,
  disabled,
  revealed = false,
  tilt = false,
  stage = false,
  className = "",
}: Props) {
  const foilRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scratched, setScratched] = useState(revealed);
  const [progress, setProgress] = useState(revealed ? 1 : 0);
  const scratching = useRef(false);
  const cells = useRef(new Set<string>());
  const triggered = useRef(revealed);
  const theme = useMemo(() => THEME[meta.theme] ?? THEME.crimson, [meta.theme]);
  const showFoil = !revealed && !scratched;
  const totalCells = 120;
  const serial = useMemo(
    () => ticketSerial(`${meta.title}:${amountLabel}:${tokenSymbol}`),
    [meta.title, amountLabel, tokenSymbol]
  );
  const name = meta.title.trim() || "Scratch & Win";

  useEffect(() => {
    if (revealed) {
      setScratched(true);
      setProgress(1);
      triggered.current = true;
    }
  }, [revealed]);

  useEffect(() => {
    if (!showFoil) return;
    const canvas = canvasRef.current;
    const wrap = foilRef.current;
    if (!canvas || !wrap) return;

    const paint = () => {
      const rect = wrap.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const g = ctx.createLinearGradient(0, 0, rect.width, rect.height);
      g.addColorStop(0, "#eceff3");
      g.addColorStop(0.28, "#c5ccd6");
      g.addColorStop(0.52, "#e8edf2");
      g.addColorStop(0.78, "#9aa7b5");
      g.addColorStop(1, "#6b7785");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, rect.width, rect.height);

      ctx.fillStyle = "rgba(255,255,255,0.32)";
      ctx.fillRect(rect.width * 0.16, 0, rect.width * 0.1, rect.height);
      ctx.fillRect(rect.width * 0.58, 0, rect.width * 0.07, rect.height);

      // Grain
      for (let i = 0; i < 90; i++) {
        ctx.fillStyle = `rgba(0,0,0,${0.03 + Math.random() * 0.05})`;
        ctx.fillRect(
          Math.random() * rect.width,
          Math.random() * rect.height,
          1 + Math.random() * 2,
          1 + Math.random() * 2
        );
      }

      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(rect.width * 0.18, rect.height * 0.38);
      ctx.quadraticCurveTo(
        rect.width * 0.42,
        rect.height * 0.18,
        rect.width * 0.72,
        rect.height * 0.4
      );
      ctx.stroke();

      ctx.fillStyle = "rgba(15,23,42,0.62)";
      ctx.font =
        "800 12px Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("SCRATCH HERE", rect.width / 2, rect.height / 2 + 4);
    };

    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [showFoil, meta.theme]);

  function markProgress(x: number, y: number, width: number, height: number) {
    const gx = Math.max(0, Math.min(9, Math.floor((x / width) * 10)));
    const gy = Math.max(0, Math.min(11, Math.floor((y / height) * 12)));
    cells.current.add(`${gx}:${gy}`);
    const next = Math.min(1, cells.current.size / totalCells);
    setProgress(next);
    if (!triggered.current && next >= 0.32) {
      triggered.current = true;
      setScratched(true);
      onThreshold?.();
    }
  }

  function erase(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    const wrap = foilRef.current;
    if (!canvas || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
    markProgress(x, y, rect.width, rect.height);
  }

  const ticket = (
    <div
      className={`relative mx-auto w-full max-w-[28rem] ${
        tilt ? "-rotate-[6deg] sm:-rotate-[8deg]" : ""
      }`}
    >
      <div
        className="relative shadow-[0_28px_50px_-24px_rgba(0,0,0,0.75)]"
        style={{
          backgroundColor: theme.paper,
          // Scalloped ticket edges (left + right)
          WebkitMaskImage: `
            radial-gradient(circle at 0, #0000 7px, #000 7.5px),
            radial-gradient(circle at 100%, #0000 7px, #000 7.5px)
          `,
          WebkitMaskSize: "51% 14px",
          WebkitMaskPosition: "0 0, 100% 0",
          WebkitMaskRepeat: "repeat-y",
          maskImage: `
            radial-gradient(circle at 0, #0000 7px, #000 7.5px),
            radial-gradient(circle at 100%, #0000 7px, #000 7.5px)
          `,
          maskSize: "51% 14px",
          maskPosition: "0 0, 100% 0",
          maskRepeat: "repeat-y",
        }}
      >
        {/* Distressed paper overlays */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.22] mix-blend-multiply"
          style={{
            backgroundImage: `
              radial-gradient(ellipse at 12% 18%, rgba(0,0,0,0.45), transparent 42%),
              radial-gradient(ellipse at 88% 78%, rgba(0,0,0,0.4), transparent 40%),
              radial-gradient(ellipse at 70% 20%, rgba(0,0,0,0.2), transparent 35%),
              repeating-linear-gradient(
                -18deg,
                transparent 0 2px,
                rgba(0,0,0,0.035) 2px 3px
              )
            `,
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30 mix-blend-soft-light"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")",
          }}
        />

        <div className="relative z-[1] flex min-h-[8.75rem] items-stretch sm:min-h-[10.5rem]">
          <PunchColumn />
          <SerialRail value={serial} />

          <div className="relative flex min-w-0 flex-1 flex-col items-center justify-center px-2 py-3 text-center sm:px-4 sm:py-4">
            {/* Inner frame */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-2 border border-black/70 sm:inset-2.5"
            />

            <div
              ref={foilRef}
              className="relative z-[1] flex w-full max-w-[15.5rem] flex-col items-center justify-center overflow-hidden px-2 py-3 sm:max-w-[17rem] sm:py-4"
              style={{
                minHeight: "5.75rem",
                backgroundColor: showFoil ? undefined : "transparent",
                backgroundImage: showFoil
                  ? "linear-gradient(135deg,#eceff3 0%,#c5ccd6 35%,#e8edf2 55%,#9aa7b5 75%,#6b7785 100%)"
                  : undefined,
              }}
            >
              {!showFoil ? (
                <div className="animate-amount-pop px-1 motion-reduce:animate-none">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/55">
                    {name}
                  </p>
                  <p className="mt-1 text-[clamp(2rem,9vw,2.75rem)] font-black leading-none tracking-[-0.04em] text-black">
                    {amountLabel}
                  </p>
                  <p className="mt-1 text-sm font-extrabold uppercase tracking-[0.16em] text-black">
                    {tokenSymbol}
                  </p>
                  {recipientLabel ? (
                    <p className="mt-2 truncate text-[10px] font-bold uppercase tracking-[0.14em] text-black/60">
                      for {recipientLabel}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="pointer-events-none absolute inset-0 z-[1] flex flex-col items-center justify-center px-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/35">
                    {name}
                  </p>
                  <p className="mt-1 text-[clamp(1.85rem,8vw,2.45rem)] font-black leading-none tracking-[-0.04em] text-black/20">
                    {amountLabel}
                  </p>
                  <p className="mt-1 text-xs font-extrabold uppercase tracking-[0.14em] text-black/20">
                    {tokenSymbol}
                  </p>
                </div>
              )}

              {showFoil ? (
                <canvas
                  ref={canvasRef}
                  className={`absolute inset-0 z-[2] ${
                    disabled
                      ? "pointer-events-none"
                      : "cursor-crosshair touch-none"
                  }`}
                  onPointerDown={(e) => {
                    if (disabled) return;
                    (e.target as HTMLCanvasElement).setPointerCapture?.(
                      e.pointerId
                    );
                    scratching.current = true;
                    erase(e.clientX, e.clientY);
                  }}
                  onPointerMove={(e) => {
                    if (!scratching.current || disabled) return;
                    erase(e.clientX, e.clientY);
                  }}
                  onPointerUp={() => {
                    scratching.current = false;
                  }}
                  onPointerCancel={() => {
                    scratching.current = false;
                  }}
                  onPointerLeave={() => {
                    scratching.current = false;
                  }}
                />
              ) : null}
            </div>
          </div>

          <SerialRail value={serial} />
          <PunchColumn />
        </div>
      </div>
    </div>
  );

  return (
    <div className={`w-full max-w-full ${className}`}>
      {stage ? (
        <div
          className={`relative overflow-hidden rounded-[1.5rem] ${theme.stage} px-4 pb-8 pt-10 sm:px-6 sm:pb-10 sm:pt-12`}
        >
          {/* Engraving-style header band like the reference cover */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[46%] overflow-hidden opacity-[0.28] contrast-125 grayscale"
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  radial-gradient(circle at 20% 40%, rgba(255,255,255,0.2) 0 1px, transparent 1.5px),
                  radial-gradient(circle at 60% 30%, rgba(255,255,255,0.16) 0 1px, transparent 1.5px),
                  radial-gradient(circle at 80% 55%, rgba(255,255,255,0.14) 0 1px, transparent 1.5px),
                  repeating-linear-gradient(
                    90deg,
                    transparent 0 6px,
                    rgba(255,255,255,0.04) 6px 7px
                  ),
                  repeating-linear-gradient(
                    0deg,
                    transparent 0 5px,
                    rgba(255,255,255,0.035) 5px 6px
                  )
                `,
                backgroundSize: "18px 18px, 22px 22px, 16px 16px, auto, auto",
              }}
            />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-black" />
          </div>
          {ticket}
        </div>
      ) : (
        ticket
      )}

      {!revealed && !disabled ? (
        <p className="mt-3 text-center text-[11px] font-medium text-graphite">
          {scratched
            ? "Revealed — claiming…"
            : `Scratch the silver panel · ${Math.round(progress * 100)}%`}
        </p>
      ) : null}
    </div>
  );
}
