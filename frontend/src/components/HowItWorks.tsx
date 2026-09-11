"use client";

import {useEffect, useRef, useState} from "react";
import {AmountPills} from "@/components/ui";
import {AMOUNT_PRESETS} from "@/lib/config";

const HANDLE = "@maria";
const PICKED = 50;

const STEPS = [
  {
    title: "Type a username.",
    body: "@maria. Hushh Protocol resolves it to their wallet and encryption key. No address paste required.",
  },
  {
    title: "Pick an amount. Deposit.",
    body: "Fixed USDC sizes only, so no amount stands out. Sign once with your Arc wallet.",
  },
  {
    title: "A note lands in the pool.",
    body: "On-chain you only see a commitment. They withdraw later with a Groth16 proof. No link back to you.",
  },
];

// Autoplays once when scrolled into view: types the handle, picks 50 USDC,
// presses Pay, slides the tx card in. Clicking a rail step replays from it.
export default function HowItWorks() {
  const ref = useRef<HTMLElement>(null);
  const [chars, setChars] = useState(0);
  const [denom, setDenom] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [cardIn, setCardIn] = useState(false);
  const [active, setActive] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const started = useRef(false);

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  const at = (ms: number, fn: () => void) =>
    timers.current.push(setTimeout(fn, ms));

  const play = (from: 0 | 1 | 2) => {
    clear();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setChars(HANDLE.length);
      setDenom(true);
      setPressed(false);
      setCardIn(true);
      setActive(2);
      return;
    }
    const amountThenPay = (t: number) => {
      at(t, () => setActive(1));
      at(t + 300, () => setDenom(true));
      at(t + 1100, () => setPressed(true));
      at(t + 1350, () => setPressed(false));
      at(t + 1900, () => {
        setActive(2);
        setCardIn(true);
      });
    };
    setPressed(false);
    if (from === 0) {
      setChars(0);
      setDenom(false);
      setCardIn(false);
      setActive(0);
      for (let i = 1; i <= HANDLE.length; i++) {
        at(400 + i * 130, () => setChars(i));
      }
      amountThenPay(400 + HANDLE.length * 130 + 500);
    } else if (from === 1) {
      setChars(HANDLE.length);
      setDenom(false);
      setCardIn(false);
      amountThenPay(200);
    } else {
      setChars(HANDLE.length);
      setDenom(true);
      setCardIn(false);
      setActive(2);
      at(150, () => setCardIn(true));
    }
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          play(0);
        }
      },
      {threshold: 0.4}
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const typed = HANDLE.slice(0, chars);

  return (
    <section
      ref={ref}
      className="flex min-h-[min(100dvh,56rem)] w-full flex-col justify-center py-10 sm:min-h-screen sm:py-0"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="text-left">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-graphite">
            Walkthrough
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
            How Hushh Protocol works
          </h2>
        </div>
        <button
          type="button"
          onClick={() => play(0)}
          className="rounded-full border border-fog bg-white px-4 py-2 text-sm font-medium text-ink shadow-[0_8px_20px_-16px_rgba(10,10,10,0.35)] transition-all hover:border-graphite hover:shadow-[0_12px_24px_-16px_rgba(10,10,10,0.4)] active:scale-[0.98]"
        >
          Replay demo
        </button>
      </div>

      <div className="mt-12 grid gap-12 text-left md:grid-cols-[300px_1fr] md:items-center">
        <div className="relative pl-6">
          <div className="absolute left-0 top-0 h-full w-px bg-fog" />
          <div
            className="absolute left-0 top-0 w-px bg-ink transition-all duration-500"
            style={{height: `${((active + 1) / STEPS.length) * 100}%`}}
          />
          <ol className="space-y-10">
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <button
                  type="button"
                  onClick={() => play(i as 0 | 1 | 2)}
                  className={`text-left transition-opacity duration-300 hover:opacity-100 ${
                    i === active ? "opacity-100" : "opacity-40"
                  }`}
                >
                  <p className="font-mono text-sm text-graphite">0{i + 1}</p>
                  <p className="mt-1 text-xl font-semibold">{step.title}</p>
                  <p className="mt-2 text-graphite">{step.body}</p>
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div
          className="flex flex-col items-center justify-center gap-10"
          aria-hidden
        >
          <div
            className={`flex w-full max-w-md flex-col items-center gap-5 transition-opacity duration-300 ${
              active === 2 ? "opacity-40" : "opacity-100"
            }`}
          >
            <div className="flex w-full items-center gap-1.5 rounded-full border border-fog bg-white p-1.5 shadow-[0_1px_0_rgba(10,10,10,0.04),0_20px_40px_-28px_rgba(10,10,10,0.35)]">
              <span className="flex min-w-0 flex-1 items-center px-4 py-2.5 text-lg sm:px-5 sm:py-3 sm:text-xl">
                {typed ? (
                  <span className="truncate font-semibold tracking-tight">
                    {typed}
                  </span>
                ) : (
                  <span className="truncate text-graphite/60">@username</span>
                )}
                <span
                  className={`ml-0.5 inline-block h-6 w-0.5 shrink-0 bg-ink ${
                    active === 2 ? "opacity-0" : "animate-pulse"
                  }`}
                />
              </span>
              <span
                className={`shrink-0 rounded-full bg-ink px-6 py-2.5 text-lg font-semibold text-paper shadow-[0_8px_18px_-12px_rgba(10,10,10,0.55)] transition-transform duration-200 sm:px-7 sm:py-3 sm:text-xl ${
                  pressed ? "scale-90" : "scale-100"
                }`}
              >
                Pay
              </span>
            </div>

            <div className="w-full space-y-3">
              <div className="rounded-2xl border border-fog bg-white px-5 py-4">
                <p className="flex items-baseline gap-2 text-4xl font-bold tracking-tight sm:text-5xl">
                  {denom ? (
                    <span
                      key={PICKED}
                      className="animate-amount-pop inline-block tabular-nums motion-reduce:animate-none"
                    >
                      {PICKED}
                    </span>
                  ) : (
                    <span className="text-fog">—</span>
                  )}
                  <span
                    className={`text-lg font-semibold ${
                      denom ? "text-graphite" : "text-fog"
                    }`}
                  >
                    USDC
                  </span>
                </p>
              </div>
              <AmountPills
                amounts={AMOUNT_PRESETS}
                value={denom ? PICKED : null}
                onChange={() => play(1)}
              />
            </div>
          </div>

          <div
            className={`panel w-full max-w-[340px] p-6 transition-all duration-700 ease-out sm:max-w-[480px] sm:p-9 ${
              cardIn ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logomark.png"
                alt=""
                className="h-8 w-8 rounded-[10px]"
                aria-hidden
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/wordmark.svg"
                alt="Hushh Protocol"
                className="h-5 w-auto sm:h-6"
              />
            </div>
            <p className="mt-8 flex items-baseline gap-2 text-5xl font-bold tracking-tight sm:text-6xl">
              <span
                key={cardIn ? "in" : "out"}
                className="animate-amount-pop inline-block tabular-nums motion-reduce:animate-none"
              >
                50
              </span>
              <span className="text-2xl font-semibold text-graphite sm:text-3xl">
                USDC
              </span>
            </p>
            <p className="mt-2 text-xl text-graphite">to @maria</p>
            <div className="mt-8 flex items-center justify-between gap-4 border-t border-fog pt-5">
              <p className="font-mono text-sm text-graphite">sent silently</p>
              <p className="font-mono text-sm text-graphite">
                0x9f3a41c7…c41d
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
