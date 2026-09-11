"use client";

import Link from "next/link";
import {useRef, useState} from "react";
import Reveal from "@/components/Reveal";

export default function LandingCta() {
  const ref = useRef<HTMLDivElement>(null);
  const [spot, setSpot] = useState({x: 70, y: 30});

  return (
    <Reveal className="w-full max-w-4xl pb-8 sm:pb-16">
      <div
        ref={ref}
        onPointerMove={(e) => {
          const el = ref.current;
          if (!el) return;
          const r = el.getBoundingClientRect();
          setSpot({
            x: ((e.clientX - r.left) / r.width) * 100,
            y: ((e.clientY - r.top) / r.height) * 100,
          });
        }}
        className="panel relative overflow-hidden px-8 py-16 text-center sm:px-14 sm:py-20"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 transition-[background] duration-300"
          style={{
            background: `radial-gradient(480px circle at ${spot.x}% ${spot.y}%, rgba(0,166,118,0.16), transparent 55%)`,
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-fog/60 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-12 h-48 w-48 rounded-full bg-signal/15 blur-3xl"
        />

        <div className="relative mx-auto mb-6 flex h-14 w-14 items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logomark.png"
            alt=""
            className="h-14 w-14 rounded-2xl shadow-[0_16px_36px_-16px_rgba(10,10,10,0.35)] ring-1 ring-ink/5"
            aria-hidden
          />
        </div>

        <p className="relative font-mono text-xs uppercase tracking-[0.22em] text-graphite">
          Hushh Protocol
        </p>
        <h2 className="relative mt-4 text-4xl font-bold tracking-tight sm:text-6xl">
          Ready when you are.
        </h2>
        <p className="relative mx-auto mt-5 max-w-md text-sm leading-relaxed text-graphite sm:text-base">
          Connect Twitter, link an Arc wallet, and send a silent note.
        </p>
        <div className="relative mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/send"
            className="inline-flex items-center rounded-full bg-ink px-7 py-3.5 text-sm font-semibold text-paper shadow-[0_12px_28px_-14px_rgba(10,10,10,0.5)] transition hover:bg-ink/90 active:scale-[0.98]"
          >
            Send USDC
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center rounded-full border border-fog bg-white/90 px-7 py-3.5 text-sm font-medium text-ink transition-colors hover:border-graphite"
          >
            Sign in
          </Link>
        </div>
      </div>
    </Reveal>
  );
}
