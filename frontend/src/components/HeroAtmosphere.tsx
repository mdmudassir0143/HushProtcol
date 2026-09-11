"use client";

/** Soft full-bleed field behind the hero — depth without clutter. */
export default function HeroAtmosphere({
  pointer,
  ready,
}: {
  pointer: {x: number; y: number};
  ready: boolean;
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden transition-opacity duration-1000 ${
        ready ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Cursor wash */}
      <div
        className="absolute inset-0 transition-[background] duration-300 ease-out motion-reduce:transition-none"
        style={{
          background: `radial-gradient(640px circle at ${pointer.x}% ${pointer.y}%, rgba(0,166,118,0.12), transparent 60%)`,
        }}
      />

      {/* Soft orbs */}
      <div className="absolute left-1/2 top-[6%] h-[22rem] w-[22rem] -translate-x-1/2">
        <div className="animate-orb h-full w-full rounded-full bg-white/65 blur-3xl motion-reduce:animate-none" />
      </div>
      <div className="absolute -left-16 bottom-[12%] h-56 w-56">
        <div className="animate-orb-slow h-full w-full rounded-full bg-fog/55 blur-3xl motion-reduce:animate-none" />
      </div>
      <div className="absolute -right-12 top-[22%] h-48 w-48">
        <div className="animate-orb h-full w-full rounded-full bg-signal/12 blur-3xl motion-reduce:animate-none" />
      </div>

      {/* Quiet commitment ring — product atmosphere, not chrome */}
      <div className="absolute left-1/2 top-[42%] h-[min(72vw,28rem)] w-[min(72vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-ink/[0.04]" />
      <div className="absolute left-1/2 top-[42%] h-[min(54vw,20rem)] w-[min(54vw,20rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-ink/[0.05]" />

      {/* Unlink path */}
      <svg
        className="absolute bottom-[14%] left-1/2 h-14 w-[min(88%,22rem)] -translate-x-1/2 text-ink/20 sm:bottom-[12%] sm:h-16 sm:w-[min(80%,26rem)]"
        viewBox="0 0 440 72"
        fill="none"
      >
        <circle
          cx="40"
          cy="32"
          r="8"
          className="fill-ink/[0.08] stroke-ink/25"
          strokeWidth="1.25"
        />
        <circle
          cx="400"
          cy="32"
          r="8"
          className="fill-signal/15 stroke-signal/40"
          strokeWidth="1.25"
        />
        <path
          d="M54 32 H170"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          className="animate-path-draw motion-reduce:animate-none"
        />
        <path
          d="M270 32 H386"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          className="animate-path-draw motion-reduce:animate-none"
          style={{animationDelay: "0.4s"}}
        />
        <path
          d="M186 32 C206 32 210 16 220 16 C230 16 234 32 254 32"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeDasharray="3 5"
          strokeLinecap="round"
          opacity="0.5"
        />
        <text
          x="220"
          y="54"
          textAnchor="middle"
          fill="currentColor"
          opacity="0.7"
          style={{fontSize: 10, fontFamily: "ui-monospace, monospace"}}
        >
          unlink
        </text>
      </svg>
    </div>
  );
}
