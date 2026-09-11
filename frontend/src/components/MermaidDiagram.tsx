"use client";

import {useEffect, useId, useRef, useState} from "react";

/** Renders a Mermaid chart with Hushh Protocol paper-theme colors. */
export function MermaidDiagram({
  chart,
  className = "",
  title,
}: {
  chart: string;
  className?: string;
  title?: string;
}) {
  const rawId = useId().replace(/:/g, "");
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      if (!hostRef.current) return;
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          fontFamily: "var(--font-sans-ui), ui-sans-serif, system-ui, sans-serif",
          themeVariables: {
            primaryColor: "#0A0A0A",
            primaryTextColor: "#F5F3EE",
            primaryBorderColor: "#0A0A0A",
            secondaryColor: "#F5F3EE",
            secondaryTextColor: "#0A0A0A",
            secondaryBorderColor: "#E5E0DE",
            tertiaryColor: "#FFFFFF",
            tertiaryTextColor: "#0A0A0A",
            tertiaryBorderColor: "#E5E0DE",
            lineColor: "#6B6B6B",
            textColor: "#0A0A0A",
            mainBkg: "#FFFFFF",
            nodeBorder: "#E5E0DE",
            clusterBkg: "#F5F3EE",
            clusterBorder: "#E5E0DE",
            titleColor: "#0A0A0A",
            edgeLabelBackground: "#F5F3EE",
            actorBkg: "#FFFFFF",
            actorBorder: "#0A0A0A",
            actorTextColor: "#0A0A0A",
            actorLineColor: "#E5E0DE",
            signalColor: "#0A0A0A",
            signalTextColor: "#0A0A0A",
            labelBoxBkgColor: "#FFFFFF",
            labelBoxBorderColor: "#E5E0DE",
            labelTextColor: "#0A0A0A",
            loopTextColor: "#6B6B6B",
            noteBkgColor: "#F5F3EE",
            noteTextColor: "#0A0A0A",
            noteBorderColor: "#E5E0DE",
            activationBkgColor: "#E5E0DE",
            activationBorderColor: "#0A0A0A",
            sequenceNumberColor: "#F5F3EE",
          },
          flowchart: {curve: "basis", padding: 12},
          sequence: {
            mirrorActors: false,
            bottomMarginAdj: 4,
            messageFontSize: 13,
            actorFontSize: 13,
            noteFontSize: 12,
          },
        });

        const {svg} = await mermaid.render(`hush-mmd-${rawId}`, chart.trim());
        if (!cancelled && hostRef.current) {
          hostRef.current.innerHTML = svg;
          const svgEl = hostRef.current.querySelector("svg");
          if (svgEl) {
            svgEl.setAttribute("role", "img");
            if (title) svgEl.setAttribute("aria-label", title);
            svgEl.style.maxWidth = "100%";
            svgEl.style.height = "auto";
          }
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    void render();
    return () => {
      cancelled = true;
    };
  }, [chart, rawId, title]);

  if (failed) {
    return (
      <pre className="overflow-x-auto rounded-xl border border-fog bg-white p-4 text-left font-mono text-xs text-graphite">
        {chart.trim()}
      </pre>
    );
  }

  return (
    <div
      ref={hostRef}
      className={`flex justify-center overflow-x-auto [&_svg]:mx-auto ${className}`}
    />
  );
}
