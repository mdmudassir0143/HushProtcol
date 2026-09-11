"use client";

import {useRef, useState} from "react";
import Reveal from "@/components/Reveal";

const PILLARS = [
  {
    title: "Fixed notes",
    body: "Only a few USDC sizes. Your amount looks like everyone else's.",
    mark: "≡",
  },
  {
    title: "ZK withdraw",
    body: "Groth16 membership proof spends a note without naming which deposit.",
    mark: "∴",
  },
  {
    title: "Username send",
    body: "Pay @someone. Hushh Protocol resolves wallet and encryption key for you.",
    mark: "@",
  },
] as const;

function PillarCard({
  title,
  body,
  mark,
  index,
}: {
  title: string;
  body: string;
  mark: string;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [spot, setSpot] = useState({x: 50, y: 40, on: false});

  return (
    <Reveal delay={index * 90} className="h-full">
      <div
        ref={ref}
        onPointerMove={(e) => {
          const el = ref.current;
          if (!el) return;
          const r = el.getBoundingClientRect();
          setSpot({
            x: ((e.clientX - r.left) / r.width) * 100,
            y: ((e.clientY - r.top) / r.height) * 100,
            on: true,
          });
        }}
        onPointerLeave={() => setSpot((s) => ({...s, on: false}))}
        className="panel group relative h-full overflow-hidden p-6 text-left transition-transform duration-500 hover:-translate-y-1.5 sm:p-7"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: spot.on
              ? `radial-gradient(300px circle at ${spot.x}% ${spot.y}%, rgba(0,166,118,0.14), transparent 55%)`
              : undefined,
          }}
        />
        <div className="relative flex items-start justify-between gap-3">
          <p className="font-mono text-xs text-graphite">0{index + 1}</p>
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-paper text-lg font-semibold text-ink/70 ring-1 ring-fog transition-transform duration-500 group-hover:scale-110 group-hover:text-signal"
          >
            {mark}
          </span>
        </div>
        <h3 className="relative mt-5 text-xl font-semibold tracking-tight sm:text-2xl">
          {title}
        </h3>
        <p className="relative mt-2.5 text-sm leading-relaxed text-graphite">
          {body}
        </p>
      </div>
    </Reveal>
  );
}

export default function InteractivePillars() {
  return (
    <Reveal className="landing-band w-full max-w-5xl">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-graphite">
        Design
      </p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
        Privacy with honest limits
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-graphite sm:text-base">
        Hushh Protocol hides the link between deposit and claim. It does not
        hide that you used the pool.
      </p>
      <div className="mt-12 grid gap-4 sm:grid-cols-3 sm:gap-5">
        {PILLARS.map((p, i) => (
          <PillarCard
            key={p.title}
            title={p.title}
            body={p.body}
            mark={p.mark}
            index={i}
          />
        ))}
      </div>
    </Reveal>
  );
}
