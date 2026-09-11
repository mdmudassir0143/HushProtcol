"use client";

import {MermaidDiagram} from "@/components/MermaidDiagram";
import Reveal from "@/components/Reveal";

const FLOW_CHART = `
flowchart LR
  A["You"] -->|pay @username| B["Hushh Protocol pool"]
  B -->|claim with proof| C["They"]
  style A fill:#0A0A0A,stroke:#0A0A0A,color:#F5F3EE
  style B fill:#FFFFFF,stroke:#0A0A0A,color:#0A0A0A
  style C fill:#0A0A0A,stroke:#0A0A0A,color:#F5F3EE
`;

const SEQUENCE_CHART = `
sequenceDiagram
  participant You
  participant App as Hushh Protocol app
  participant Pool as Arc pool
  participant Them as Recipient

  You->>App: Pick @username and amount
  App->>Pool: Deposit fixed USDC note
  Note over Pool: Chain sees a commitment only
  Them->>App: Open inbox and claim
  Them->>Pool: Withdraw with ZK proof
  Pool-->>Them: USDC arrives
`;

const PRIVACY_CHART = `
flowchart TB
  subgraph public ["Visible on Arc"]
    D["Deposit of fixed USDC"]
    C["Commitment hash"]
    W["Later withdraw of same size"]
  end
  subgraph hidden ["Not linked on-chain"]
    L["Which deposit funded which claim"]
  end
  D --- C
  C -.->|broken link| W
  L:::mute
  classDef mute fill:#F5F3EE,stroke:#E5E0DE,color:#6B6B6B
`;

const DIAGRAMS = [
  {
    title: "The simple path",
    body: "You pay a username. Funds sit in the pool as a note. They claim later with a proof.",
    chart: FLOW_CHART,
  },
  {
    title: "What happens step by step",
    body: "Deposit and withdraw are separate transactions. The app delivers an encrypted note off-chain.",
    chart: SEQUENCE_CHART,
  },
  {
    title: "What privacy means here",
    body: "Amounts use fixed sizes. The chain does not show which deposit paid which claim.",
    chart: PRIVACY_CHART,
  },
] as const;

export default function ProjectDiagrams() {
  return (
    <Reveal className="w-full max-w-4xl text-left">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          How Hushh Protocol works
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-graphite sm:text-base">
          Three pictures. No jargon required.
        </p>
      </div>

      <div className="mt-12 space-y-10">
        {DIAGRAMS.map((d, i) => (
          <Reveal key={d.title} delay={i * 80} className="panel p-5 sm:p-8">
            <p className="font-mono text-xs text-graphite">
              0{i + 1}
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
              {d.title}
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-graphite sm:text-base">
              {d.body}
            </p>
            <div className="mt-6 rounded-xl border border-fog bg-paper/50 p-3 sm:p-5">
              <MermaidDiagram chart={d.chart} title={d.title} />
            </div>
          </Reveal>
        ))}
      </div>
    </Reveal>
  );
}
