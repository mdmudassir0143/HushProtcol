"use client";

import {useState} from "react";
import Reveal from "@/components/Reveal";

const SAMPLE_NOTES = [
  {amount: 10, token: "USDC", hash: "9f3a41c7…c41d"},
  {amount: 50, token: "USDC", hash: "b7e208aa…08aa"},
  {amount: 100, token: "USDC", hash: "1c8fb0d2…b0d2"},
  {amount: 1, token: "USDC", hash: "e05cb912…b912"},
  {amount: 50, token: "USDC", hash: "77a8d4c6…d4c6"},
  {amount: 10, token: "USDC", hash: "3a4e59fb…59fb"},
];

export default function InteractiveNoteStrip() {
  const [selected, setSelected] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);

  return (
    <Reveal className="landing-band w-full max-w-5xl">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-graphite">
        On-chain
      </p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
        What the chain sees
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-graphite sm:text-base">
        Fixed USDC notes and Poseidon commitments. Tap one — it could be yours,
        or someone else&apos;s. The chain cannot tell.
      </p>

      <div
        className="relative mt-12 overflow-hidden rounded-[1.75rem] border border-fog/70 bg-gradient-to-b from-white/70 to-white/35 py-8 backdrop-blur-[1px] sm:py-10"
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
      >
        <div className="mb-5 flex items-center justify-center gap-2 px-4">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              paused ? "bg-amber" : "animate-pulse bg-signal"
            }`}
          />
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-graphite">
            {paused ? "Paused · inspect a note" : "Live commitments"}
          </p>
        </div>

        <div
          className={`flex w-max ${
            paused ? "[animation-play-state:paused]" : ""
          } animate-drift-slow motion-reduce:animate-none`}
        >
          {[...SAMPLE_NOTES, ...SAMPLE_NOTES].map((note, i) => {
            const key = i % SAMPLE_NOTES.length;
            const on = selected === key;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelected(on ? null : key)}
                className={`panel mr-4 w-56 shrink-0 p-5 text-left transition-all duration-300 sm:w-64 sm:p-6 ${
                  on
                    ? "-translate-y-1.5 border-signal/35 ring-2 ring-signal/20"
                    : "hover:-translate-y-1"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-graphite">
                    Note
                  </p>
                  <span
                    className={`h-2 w-2 rounded-full ${
                      on ? "bg-signal" : "bg-fog"
                    }`}
                  />
                </div>
                <p className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                  {note.amount}{" "}
                  <span className="text-base font-semibold text-graphite">
                    {note.token}
                  </span>
                </p>
                <p className="mt-3 truncate font-mono text-xs text-graphite">
                  0x{note.hash}
                </p>
                <div
                  className={`grid transition-[grid-template-rows,opacity] duration-300 ${
                    on
                      ? "mt-3 grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <p className="overflow-hidden text-[11px] leading-snug text-signal">
                    Commitment only. No sender. No recipient.
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-paper to-transparent sm:w-24" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-paper to-transparent sm:w-24" />
      </div>

      <p className="mx-auto mt-8 max-w-xl text-sm leading-relaxed text-graphite sm:text-base">
        The withdraw proof spends a note without revealing which deposit it came
        from.
      </p>
    </Reveal>
  );
}
