"use client";

import {useEffect, useState} from "react";

const MIN_VISIBLE_MS = 1100;
const FADE_MS = 520;

/**
 * Full-viewport boot splash with the Hushh logomark.
 * Shows once per browser tab session, then fades out.
 */
export function AppLoader() {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduceMotion(reduce);

    try {
      if (sessionStorage.getItem("hush.boot") === "1") {
        setVisible(false);
        return;
      }
    } catch {
      // private mode / blocked storage — still show once this mount
    }

    const hold = reduce ? 400 : MIN_VISIBLE_MS;
    const tExit = window.setTimeout(() => setExiting(true), hold);
    const tDone = window.setTimeout(() => {
      setVisible(false);
      try {
        sessionStorage.setItem("hush.boot", "1");
      } catch {
        // ignore
      }
    }, hold + FADE_MS);

    return () => {
      window.clearTimeout(tExit);
      window.clearTimeout(tDone);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading Hushh Protocol"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-paper transition-opacity ease-out ${
        exiting ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={{transitionDuration: `${FADE_MS}ms`}}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute left-1/2 top-[18%] h-72 w-72 -translate-x-1/2 rounded-full bg-white/80 blur-3xl" />
        <div className="absolute bottom-[12%] left-[8%] h-56 w-56 rounded-full bg-fog/50 blur-3xl" />
      </div>

      <div
        className={`relative flex flex-col items-center gap-8 ${
          reduceMotion || exiting ? "" : "animate-loader-in"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logomark.png"
          alt=""
          width={280}
          height={280}
          className={`h-[min(42vw,14rem)] w-[min(42vw,14rem)] rounded-[2rem] bg-white object-cover ring-1 ring-ink/5 sm:h-56 sm:w-56 sm:rounded-[2.25rem] md:h-64 md:w-64 ${
            reduceMotion || exiting ? "" : "animate-loader-breathe"
          }`}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/wordmark.svg"
          alt="Hushh Protocol"
          className="h-7 w-auto opacity-90 sm:h-8"
        />
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-graphite">
          send silently
        </p>
      </div>
    </div>
  );
}
