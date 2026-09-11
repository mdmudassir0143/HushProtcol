"use client";

import Link from "next/link";
import {useCallback, useEffect, useRef, useState} from "react";
import {useAccount} from "wagmi";
import HeroAtmosphere from "@/components/HeroAtmosphere";
import HeroSendBox from "@/components/HeroSendBox";

/** Rotating tagline nouns / words after "send". */
const SEND_WORDS = [
  {word: "Silently", color: "text-ink"},
  {word: "Privacy", color: "text-signal"},
  {word: "Hush", color: "text-[#2F6FED]"},
  {word: "Notes", color: "text-[#7A5C3E]"},
  {word: "Quietly", color: "text-amber"},
  {word: "Silence", color: "text-[#5B7C6A]"},
  {word: "Unseen", color: "text-graphite"},
] as const;

const WORD_MS = 2400;

export default function LandingHero() {
  const {isConnected} = useAccount();
  const sectionRef = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [pointer, setPointer] = useState({x: 50, y: 38});
  const pauseUntil = useRef(0);

  const pauseBriefly = useCallback(() => {
    pauseUntil.current = Date.now() + 5000;
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduceMotion(reduce);
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!ready || reduceMotion) return;
    const id = window.setInterval(() => {
      if (Date.now() < pauseUntil.current) return;
      setWordIndex((i) => (i + 1) % SEND_WORDS.length);
      setAnimKey((k) => k + 1);
    }, WORD_MS);
    return () => window.clearInterval(id);
  }, [ready, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    const el = sectionRef.current;
    if (!el) return;

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      setPointer({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });
    };
    const onLeave = () => setPointer({x: 50, y: 38});

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [reduceMotion]);

  const active = SEND_WORDS[wordIndex];

  function goToWord(i: number) {
    pauseBriefly();
    setWordIndex(i);
    setAnimKey((k) => k + 1);
  }

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[calc(100svh-5.5rem)] w-full max-w-6xl flex-col items-center justify-center overflow-hidden pb-14 pt-2 text-center sm:min-h-[calc(100svh-7rem)] sm:pb-16 sm:pt-4"
    >
      <HeroAtmosphere pointer={pointer} ready={ready} />

      <p
        className={`animate-rise inline-flex items-center gap-3 font-mono text-xs uppercase tracking-[0.28em] text-graphite sm:text-sm ${
          ready ? "" : "opacity-0"
        }`}
      >
        <span className="h-px w-8 bg-fog" aria-hidden />
        Private payments on Arc
        <span className="h-px w-8 bg-fog" aria-hidden />
      </p>

      <div className={`mt-10 ${ready ? "" : "opacity-0"}`}>
        <h1 className="text-5xl font-extrabold leading-[0.92] tracking-[-0.055em] sm:text-7xl md:text-8xl lg:text-[6.75rem]">
          <span className="sr-only">send silently. via Hushh Protocol</span>
          <span
            aria-hidden
            className="inline-flex flex-wrap items-baseline justify-center gap-x-[0.28em]"
          >
            <span
              className={
                reduceMotion || !ready
                  ? "inline-block"
                  : "animate-word-in inline-block"
              }
              style={
                reduceMotion || !ready ? undefined : {animationDelay: "180ms"}
              }
            >
              send
            </span>
            <span className="relative inline-grid justify-items-start">
              <span className="invisible col-start-1 row-start-1">
                Silently
              </span>
              {reduceMotion ? (
                <span className="col-start-1 row-start-1 inline-block text-ink">
                  Silently.
                </span>
              ) : (
                <button
                  type="button"
                  key={animKey}
                  onClick={() =>
                    goToWord((wordIndex + 1) % SEND_WORDS.length)
                  }
                  className={`col-start-1 row-start-1 inline-block cursor-pointer rounded-sm underline decoration-transparent decoration-[3px] underline-offset-[0.12em] transition-[text-decoration-color] duration-300 hover:decoration-current/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 ${active.color} animate-word-swap`}
                  title="Tap to cycle"
                  aria-label={`send ${active.word}. Tap to change.`}
                >
                  {active.word}.
                </button>
              )}
            </span>
          </span>
        </h1>

        {/* Static brand line under the word animation */}
        <p className="mt-5 inline-flex flex-wrap items-center justify-center gap-3 text-2xl font-semibold tracking-[-0.03em] text-ink sm:mt-6 sm:gap-3.5 sm:text-3xl md:text-4xl lg:text-5xl">
          <span className="font-medium text-graphite">via</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logomark.png"
            alt=""
            className="h-10 w-10 rounded-xl shadow-[0_8px_20px_-10px_rgba(10,10,10,0.3)] ring-1 ring-ink/5 sm:h-12 sm:w-12 sm:rounded-[14px] md:h-14 md:w-14"
          />
          <span className="font-extrabold tracking-[-0.04em]">
            Hushh Protocol
          </span>
        </p>
      </div>

      <p
        className={`mx-auto mt-7 max-w-2xl text-lg leading-relaxed tracking-[-0.01em] text-graphite sm:max-w-3xl sm:text-xl md:text-2xl ${
          ready ? "" : "opacity-0"
        }`}
      >
        ZK-private USDC on Arc. Deposit a fixed note. They withdraw with a
        proof. Nothing on-chain connects the two.
      </p>

      <div
        className={`animate-rise mt-12 flex w-full max-w-3xl flex-col items-center gap-6 [animation-delay:520ms] ${
          ready ? "" : "opacity-0"
        }`}
      >
        <HeroSendBox />
        <div className="flex flex-wrap items-center justify-center gap-3">
          {isConnected ? (
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-base font-semibold tracking-[-0.01em] text-paper shadow-[0_8px_20px_-12px_rgba(10,10,10,0.45)] transition hover:bg-ink/90 active:scale-[0.98]"
            >
              Connect Twitter
            </Link>
          ) : null}
          <a
            href="#how-it-works"
            className="group inline-flex items-center gap-2 rounded-full border border-fog/90 bg-white/75 px-6 py-3 text-base font-medium tracking-[-0.01em] text-ink backdrop-blur-sm transition-colors hover:border-graphite hover:bg-white"
          >
            How it works
            <span
              aria-hidden
              className="translate-y-px text-graphite transition-transform duration-300 group-hover:translate-y-0.5"
            >
              ↓
            </span>
          </a>
        </div>
      </div>

      <div
        className={`animate-rise mt-16 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-mono text-xs uppercase tracking-[0.18em] text-graphite/80 sm:text-sm [animation-delay:600ms] ${
          ready ? "" : "opacity-0"
        }`}
      >
        {["Arc Testnet", "Groth16", "Fixed notes"].map((label, i) => (
          <span key={label} className="contents">
            {i > 0 ? (
              <span className="hidden text-fog sm:inline" aria-hidden>
                ·
              </span>
            ) : null}
            <span
              className={
                reduceMotion || !ready
                  ? undefined
                  : "animate-word-in inline-block"
              }
              style={
                reduceMotion || !ready
                  ? undefined
                  : {animationDelay: `${640 + i * 90}ms`}
              }
            >
              {label}
            </span>
          </span>
        ))}
      </div>

      <a
        href="#architecture"
        className={`absolute bottom-3 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5 text-graphite transition-opacity duration-700 hover:text-ink ${
          ready ? "opacity-100" : "opacity-0"
        }`}
        aria-label="Scroll to architecture"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
          Explore
        </span>
        <span
          aria-hidden
          className="animate-scroll-cue text-sm motion-reduce:animate-none"
        >
          ↓
        </span>
      </a>
    </section>
  );
}
