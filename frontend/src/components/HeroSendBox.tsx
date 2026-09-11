"use client";

import {useEffect, useState} from "react";
import type {RecipientKind} from "@/components/RecipientKind";
import {RecipientKindSelect} from "@/components/RecipientKindSelect";

const SAMPLES = ["@maria", "ada@email.com", "@kyle", "pay@hussh.app"];

export default function HeroSendBox() {
  const [value, setValue] = useState("");
  const [kind, setKind] = useState<Exclude<RecipientKind, "unknown">>("twitter");
  const [placeholder, setPlaceholder] = useState("@username");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let word = 0;
    let len = 0;
    let deleting = false;
    let t: ReturnType<typeof setTimeout>;

    const step = () => {
      const sample = SAMPLES[word];
      if (!deleting && len === 0) {
        setKind(
          sample.includes("@") && !sample.startsWith("@") ? "email" : "twitter"
        );
      }
      if (!deleting && len < sample.length) {
        len += 1;
      } else if (!deleting) {
        deleting = true;
        t = setTimeout(step, 1800);
        return;
      } else if (len > 0) {
        len -= 1;
      } else {
        deleting = false;
        word = (word + 1) % SAMPLES.length;
      }
      setPlaceholder(sample.slice(0, len));
      t = setTimeout(step, deleting ? 40 : 90);
    };

    t = setTimeout(step, 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <form
      action="/send"
      method="get"
      className="group/shell relative input-shell mx-auto w-full max-w-3xl !rounded-full !py-2 !pl-2 !pr-2 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset,0_1px_0_rgba(10,10,10,0.04),0_28px_56px_-28px_rgba(10,10,10,0.38)] transition-shadow duration-500 hover:shadow-[0_1px_0_rgba(255,255,255,0.7)_inset,0_1px_0_rgba(10,10,10,0.04),0_32px_64px_-24px_rgba(10,10,10,0.42)]"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-1 -z-10 rounded-full bg-signal/15 opacity-0 blur-md transition-opacity duration-500 group-focus-within/shell:opacity-100 group-hover/shell:opacity-70"
      />
      <input type="hidden" name="kind" value={kind} />
      <RecipientKindSelect value={kind} onChange={setKind} variant="inline" />
      <span className="input-shell-divider" aria-hidden />
      <input
        type="text"
        name="to"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={
          value
            ? undefined
            : placeholder || (kind === "email" ? "name@email.com" : "@username")
        }
        autoComplete="off"
        spellCheck={false}
        className="input-shell-field !py-3.5 !text-xl sm:!text-2xl"
      />
      <button
        type="submit"
        className="shrink-0 rounded-full bg-ink px-8 py-3.5 text-lg font-semibold tracking-[-0.015em] text-paper shadow-[0_8px_20px_-10px_rgba(10,10,10,0.55)] transition-all duration-200 hover:bg-ink/90 active:scale-[0.97] sm:px-10 sm:py-4 sm:text-xl"
      >
        Pay
      </button>
    </form>
  );
}
