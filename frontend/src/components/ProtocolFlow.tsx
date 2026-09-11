"use client";

import {useEffect, useRef, useState, type ReactNode} from "react";
import Reveal from "@/components/Reveal";

const PHASES = [
  {
    id: "identity",
    n: "01",
    title: "Connect & claim",
    body: "Wallet signs in on Arc. You claim an @username so others can pay you without seeing your address.",
    nodes: ["wallet", "app", "identity"],
    edges: ["you-hussh", "within-hussh"],
    lane: "Client",
  },
  {
    id: "deposit",
    n: "02",
    title: "Deposit note",
    body: "You send a fixed USDC size to a username. Hushh Protocol seals an encrypted note and deposits a Poseidon commitment into the pool.",
    nodes: ["you", "app", "note", "pool", "commitment"],
    edges: ["you-hussh", "hussh-pool", "within-pool"],
    lane: "Deposit path",
  },
  {
    id: "hold",
    n: "03",
    title: "Pool holds",
    body: "On-chain observers see a commitment hash and a fixed amount. Nothing links the sender wallet to the eventual claim.",
    nodes: ["pool", "commitment", "arc"],
    edges: ["within-pool"],
    lane: "On-chain",
  },
  {
    id: "withdraw",
    n: "04",
    title: "ZK withdraw",
    body: "Recipient opens the note, builds a Groth16 membership proof, and withdraws USDC. The deposit↔claim link stays off-chain.",
    nodes: ["them", "note", "proof", "pool", "usdc"],
    edges: ["pool-them", "hussh-pool", "within-pool"],
    lane: "Claim path",
  },
] as const;

type PhaseId = (typeof PHASES)[number]["id"];

const STEP_MS = 4200;
const EASE = "duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]";

export default function ProtocolFlow() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);
  const [paused, setPaused] = useState(false);
  const [focusNode, setFocusNode] = useState<string | null>(null);

  const phase = PHASES[active];
  const litNodes = new Set<string>(phase.nodes);
  const litEdges = new Set<string>(phase.edges);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setInView(true);
      },
      {threshold: 0.2}
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % PHASES.length);
      setFocusNode(null);
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, [inView, paused]);

  function go(i: number) {
    setActive(i);
    setPaused(true);
    setFocusNode(null);
  }

  function selectNode(nodeId: string, phaseId: PhaseId) {
    const idx = PHASES.findIndex((p) => p.id === phaseId);
    if (idx >= 0) {
      setActive(idx);
      setPaused(true);
    }
    setFocusNode(nodeId);
  }

  function nodeTone(id: string) {
    if (focusNode === id) return "focus";
    if (litNodes.has(id)) return "lit";
    return "dim";
  }

  function edgeLit(id: string) {
    return litEdges.has(id);
  }

  return (
    <Reveal className="w-full max-w-6xl text-left">
      <div className="text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-graphite">
          Architecture
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
          From wallet to withdraw.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-graphite sm:text-base">
          Client, off-chain note, Arc pool, and ZK claim. Hover or tap a box to
          follow the path. Nothing on-chain links deposit to claim.
        </p>
      </div>

      <div
        ref={ref}
        className="mt-12"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div
          role="tablist"
          aria-label="Architecture phases"
          className="flex gap-2 overflow-x-auto pb-1"
        >
          {PHASES.map((p, i) => {
            const on = active === i;
            return (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => go(i)}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold tracking-tight transition-all ${EASE} focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 ${
                  on
                    ? "border-ink bg-ink text-paper"
                    : "border-fog bg-white text-graphite hover:border-graphite/40 hover:text-ink"
                }`}
              >
                <span className="font-mono text-[10px] opacity-70">{p.n}</span>{" "}
                {p.title}
              </button>
            );
          })}
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-fog bg-white">
          <div className="flex items-center justify-between border-b border-fog px-5 py-3 sm:px-7">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-graphite">
              {phase.lane}
            </p>
            <p className="text-xs text-graphite">
              Tap any node · autoplay pauses on hover
            </p>
          </div>

          <div className="relative px-3 py-8 sm:px-6 sm:py-10">
            {/* Desktop: columns + arrows */}
            <div className="hidden items-stretch lg:flex">
              <Column label="You">
                <ArchNode
                  tone={nodeTone("wallet")}
                  kicker="MetaMask"
                  title="Wallet"
                  detail="Arc Testnet"
                  onClick={() => selectNode("wallet", "identity")}
                />
                <DownArrow
                  lit={edgeLit("you-hussh") || nodeTone("you") !== "dim"}
                  label="sign in"
                />
                <ArchNode
                  tone={nodeTone("you")}
                  kicker="Sender"
                  title="You"
                  detail="Fixed USDC note"
                  onClick={() => selectNode("you", "deposit")}
                />
              </Column>

              <HArrow
                lit={edgeLit("you-hussh")}
                label={active === 0 ? "connect" : "send USDC"}
              />

              <Column label="Hushh Protocol">
                <ArchNode
                  tone={nodeTone("app")}
                  kicker="App"
                  title="Hushh Protocol client"
                  detail="Resolve @username"
                  onClick={() => selectNode("app", "identity")}
                />
                <DownArrow lit={edgeLit("within-hussh")} label="claim handle" />
                <ArchNode
                  tone={nodeTone("identity")}
                  kicker="Identity"
                  title="@username"
                  detail="No address on send"
                  onClick={() => selectNode("identity", "identity")}
                />
                <DownArrow lit={edgeLit("hussh-pool")} label="encrypt note" />
                <ArchNode
                  tone={nodeTone("note")}
                  kicker="Off-chain"
                  title="Encrypted note"
                  detail="Payload to inbox"
                  onClick={() => selectNode("note", "deposit")}
                />
              </Column>

              <HArrow
                lit={edgeLit("hussh-pool")}
                label={active <= 2 ? "deposit" : "prove"}
              />

              <Column label="Arc pool">
                <ArchNode
                  tone={nodeTone("pool")}
                  kicker="Contract"
                  title="BulletPool"
                  detail="deposit / withdraw"
                  onClick={() => selectNode("pool", "hold")}
                />
                <DownArrow lit={edgeLit("within-pool")} label="Poseidon leaf" />
                <ArchNode
                  tone={nodeTone("commitment")}
                  kicker="Poseidon"
                  title="Commitment"
                  detail="Leaf in Merkle tree"
                  onClick={() => selectNode("commitment", "hold")}
                />
                <DownArrow lit={edgeLit("within-pool") && active === 2} label="on-chain only" />
                <ArchNode
                  tone={nodeTone("arc")}
                  kicker="Chain"
                  title="Arc Testnet"
                  detail="Sees hash + size only"
                  onClick={() => selectNode("arc", "hold")}
                />
                <DownArrow
                  lit={edgeLit("within-pool") && active === 3}
                  label="Groth16 verify"
                />
                <ArchNode
                  tone={nodeTone("proof")}
                  kicker="Groth16"
                  title="ZK proof"
                  detail="Membership · nullifier"
                  onClick={() => selectNode("proof", "withdraw")}
                />
              </Column>

              <HArrow
                lit={edgeLit("pool-them")}
                label="withdraw"
                reverse={false}
              />

              <Column label="Them">
                <ArchNode
                  tone={nodeTone("them")}
                  kicker="Recipient"
                  title="Them"
                  detail="Opens inbox"
                  onClick={() => selectNode("them", "withdraw")}
                />
                <DownArrow lit={edgeLit("pool-them")} label="claim USDC" />
                <ArchNode
                  tone={nodeTone("usdc")}
                  kicker="Out"
                  title="USDC out"
                  detail="Unlinked withdraw"
                  onClick={() => selectNode("usdc", "withdraw")}
                />
              </Column>
            </div>

            {/* Tablet / medium */}
            <div className="hidden md:block lg:hidden">
              <FlowStrip active={active} edgeLit={edgeLit} />
              <div className="mt-6 grid grid-cols-2 gap-4">
                <Column label="You">
                  <ArchNode
                    tone={nodeTone("wallet")}
                    kicker="MetaMask"
                    title="Wallet"
                    detail="Arc Testnet"
                    onClick={() => selectNode("wallet", "identity")}
                  />
                  <ArchNode
                    tone={nodeTone("you")}
                    kicker="Sender"
                    title="You"
                    detail="Fixed USDC note"
                    onClick={() => selectNode("you", "deposit")}
                  />
                </Column>
                <Column label="Hushh Protocol">
                  <ArchNode
                    tone={nodeTone("app")}
                    kicker="App"
                    title="Hushh Protocol client"
                    detail="Resolve @username"
                    onClick={() => selectNode("app", "identity")}
                  />
                  <ArchNode
                    tone={nodeTone("note")}
                    kicker="Off-chain"
                    title="Encrypted note"
                    detail="Payload to inbox"
                    onClick={() => selectNode("note", "deposit")}
                  />
                </Column>
                <Column label="Arc pool">
                  <ArchNode
                    tone={nodeTone("pool")}
                    kicker="Contract"
                    title="BulletPool"
                    detail="deposit / withdraw"
                    onClick={() => selectNode("pool", "hold")}
                  />
                  <ArchNode
                    tone={nodeTone("commitment")}
                    kicker="Poseidon"
                    title="Commitment"
                    detail="Leaf in Merkle tree"
                    onClick={() => selectNode("commitment", "hold")}
                  />
                  <ArchNode
                    tone={nodeTone("proof")}
                    kicker="Groth16"
                    title="ZK proof"
                    detail="Membership · nullifier"
                    onClick={() => selectNode("proof", "withdraw")}
                  />
                </Column>
                <Column label="Them">
                  <ArchNode
                    tone={nodeTone("them")}
                    kicker="Recipient"
                    title="Them"
                    detail="Opens inbox"
                    onClick={() => selectNode("them", "withdraw")}
                  />
                  <ArchNode
                    tone={nodeTone("usdc")}
                    kicker="Out"
                    title="USDC out"
                    detail="Unlinked withdraw"
                    onClick={() => selectNode("usdc", "withdraw")}
                  />
                </Column>
              </div>
            </div>

            {/* Mobile */}
            <div className="space-y-1 md:hidden">
              <Lane label="You">
                <ArchNode
                  tone={nodeTone("wallet")}
                  kicker="MetaMask"
                  title="Wallet"
                  detail="Arc Testnet"
                  onClick={() => selectNode("wallet", "identity")}
                />
                <DownArrow lit={edgeLit("you-hussh")} label="connect · send" />
                <ArchNode
                  tone={nodeTone("you")}
                  kicker="Sender"
                  title="You"
                  detail="Fixed USDC note"
                  onClick={() => selectNode("you", "deposit")}
                />
              </Lane>
              <DownArrow lit={edgeLit("you-hussh")} label="to Hushh Protocol" />
              <Lane label="Hushh Protocol">
                <ArchNode
                  tone={nodeTone("app")}
                  kicker="App"
                  title="Hushh Protocol client"
                  detail="Resolve @username"
                  onClick={() => selectNode("app", "identity")}
                />
                <DownArrow lit={edgeLit("hussh-pool")} label="encrypt · deposit" />
                <ArchNode
                  tone={nodeTone("note")}
                  kicker="Off-chain"
                  title="Encrypted note"
                  detail="Payload to inbox"
                  onClick={() => selectNode("note", "deposit")}
                />
              </Lane>
              <DownArrow lit={edgeLit("hussh-pool")} label="to Arc pool" />
              <Lane label="Arc pool">
                <ArchNode
                  tone={nodeTone("pool")}
                  kicker="Contract"
                  title="BulletPool"
                  detail="deposit / withdraw"
                  onClick={() => selectNode("pool", "hold")}
                />
                <DownArrow lit={edgeLit("within-pool")} label="commitment" />
                <ArchNode
                  tone={nodeTone("commitment")}
                  kicker="Poseidon"
                  title="Commitment"
                  detail="Leaf in Merkle tree"
                  onClick={() => selectNode("commitment", "hold")}
                />
                <DownArrow lit={active === 3} label="ZK verify" />
                <ArchNode
                  tone={nodeTone("proof")}
                  kicker="Groth16"
                  title="ZK proof"
                  detail="Membership · nullifier"
                  onClick={() => selectNode("proof", "withdraw")}
                />
              </Lane>
              <DownArrow lit={edgeLit("pool-them")} label="to recipient" />
              <Lane label="Them">
                <ArchNode
                  tone={nodeTone("them")}
                  kicker="Recipient"
                  title="Them"
                  detail="Opens inbox"
                  onClick={() => selectNode("them", "withdraw")}
                />
                <DownArrow lit={edgeLit("pool-them")} label="claim" />
                <ArchNode
                  tone={nodeTone("usdc")}
                  kicker="Out"
                  title="USDC out"
                  detail="Unlinked withdraw"
                  onClick={() => selectNode("usdc", "withdraw")}
                />
              </Lane>
            </div>
          </div>

          <div className="border-t border-fog bg-paper/50 px-5 py-6 sm:px-7">
            <div
              key={phase.id}
              className="animate-sheet-in motion-reduce:animate-none"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-graphite">
                {phase.n} · {phase.lane}
              </p>
              <h3 className="mt-2 text-2xl font-bold tracking-tight">
                {phase.title}
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-graphite sm:text-base">
                {phase.body}
              </p>
            </div>

            <div className="mt-5 flex items-center gap-1.5">
              {PHASES.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  aria-label={p.title}
                  onClick={() => go(i)}
                  className={`h-1.5 rounded-full transition-all ${EASE} ${
                    i === active
                      ? "w-8 bg-ink"
                      : "w-1.5 bg-fog hover:bg-graphite/40"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PHASES.map((p, i) => {
            const on = active === i;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => go(i)}
                className={`rounded-2xl border p-4 text-left transition-all ${EASE} focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 ${
                  on
                    ? "border-ink bg-ink text-paper"
                    : "border-fog bg-white text-ink hover:border-graphite/40"
                }`}
              >
                <p
                  className={`font-mono text-[11px] ${
                    on ? "text-paper/55" : "text-graphite"
                  }`}
                >
                  {p.n}
                </p>
                <p className="mt-2 text-sm font-semibold tracking-tight">
                  {p.title}
                </p>
                <p
                  className={`mt-1.5 text-xs leading-relaxed ${
                    on ? "text-paper/65" : "text-graphite"
                  }`}
                >
                  {p.lane}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </Reveal>
  );
}

function Column({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <p className="mb-3 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-graphite">
        {label}
      </p>
      <div className="flex flex-1 flex-col gap-0">{children}</div>
    </div>
  );
}

function ArchNode({
  tone,
  kicker,
  title,
  detail,
  onClick,
}: {
  tone: "focus" | "lit" | "dim";
  kicker: string;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-3.5 py-3 text-left transition-all ${EASE} focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 active:scale-[0.98] ${
        tone === "focus"
          ? "border-ink bg-ink text-paper"
          : tone === "lit"
            ? "border-ink/40 bg-paper text-ink"
            : "border-fog bg-white text-graphite hover:border-graphite/35 hover:text-ink"
      }`}
    >
      <p
        className={`font-mono text-[10px] tracking-wide ${
          tone === "focus" ? "text-paper/50" : "text-graphite"
        }`}
      >
        {kicker}
      </p>
      <p
        className={`mt-1 text-sm font-semibold tracking-tight ${
          tone === "focus" ? "text-paper" : "text-ink"
        }`}
      >
        {title}
      </p>
      <p
        className={`mt-0.5 text-xs leading-snug ${
          tone === "focus" ? "text-paper/65" : "text-graphite"
        }`}
      >
        {detail}
      </p>
    </button>
  );
}

function HArrow({
  lit,
  label,
}: {
  lit: boolean;
  label: string;
  reverse?: boolean;
}) {
  return (
    <div
      className="mx-1 flex w-16 shrink-0 flex-col items-center justify-center self-center sm:mx-2 sm:w-20"
      aria-hidden
    >
      <p
        className={`mb-2 max-w-[4.5rem] text-center font-mono text-[10px] leading-tight tracking-wide transition-colors ${EASE} ${
          lit ? "text-ink" : "text-graphite/50"
        }`}
      >
        {label}
      </p>
      <div className="relative flex w-full items-center">
        <div
          className={`h-0.5 flex-1 rounded-full transition-colors ${EASE} ${
            lit ? "bg-ink" : "bg-fog"
          }`}
        />
        <div
          className={`ml-[-1px] h-2.5 w-2.5 rotate-45 border-r-2 border-t-2 transition-colors ${EASE} ${
            lit ? "border-ink" : "border-fog"
          }`}
        />
      </div>
    </div>
  );
}

function DownArrow({lit, label}: {lit: boolean; label: string}) {
  return (
    <div className="flex flex-col items-center py-1.5" aria-hidden>
      <div
        className={`h-4 w-0.5 rounded-full transition-colors ${EASE} ${
          lit ? "bg-ink" : "bg-fog"
        }`}
      />
      <div
        className={`mt-[-2px] h-2 w-2 rotate-45 border-b-2 border-r-2 transition-colors ${EASE} ${
          lit ? "border-ink" : "border-fog"
        }`}
      />
      <p
        className={`mt-1 font-mono text-[10px] tracking-wide transition-colors ${EASE} ${
          lit ? "text-ink" : "text-graphite/45"
        }`}
      >
        {label}
      </p>
    </div>
  );
}

function FlowStrip({
  active,
  edgeLit,
}: {
  active: number;
  edgeLit: (id: string) => boolean;
}) {
  const steps = [
    {label: "You", lit: active <= 1 || edgeLit("you-hussh")},
    {label: "Hushh Protocol", lit: edgeLit("you-hussh") || edgeLit("hussh-pool")},
    {label: "Pool", lit: edgeLit("hussh-pool") || edgeLit("within-pool")},
    {label: "Them", lit: edgeLit("pool-them") || active === 3},
  ];
  return (
    <div className="flex items-center justify-between gap-1 rounded-xl border border-fog bg-paper/50 px-3 py-3">
      {steps.map((s, i) => (
        <div key={s.label} className="contents">
          {i > 0 ? (
            <div className="relative mx-1 flex flex-1 items-center" aria-hidden>
              <div
                className={`h-0.5 w-full rounded-full transition-colors ${EASE} ${
                  steps[i].lit && steps[i - 1].lit ? "bg-ink" : "bg-fog"
                }`}
              />
              <div
                className={`absolute right-0 h-2 w-2 rotate-45 border-r-2 border-t-2 transition-colors ${EASE} ${
                  steps[i].lit && steps[i - 1].lit ? "border-ink" : "border-fog"
                }`}
              />
            </div>
          ) : null}
          <span
            className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all ${EASE} ${
              s.lit
                ? "border-ink bg-ink text-paper"
                : "border-fog bg-white text-graphite"
            }`}
          >
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function Lane({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-graphite">
        {label}
      </p>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}
