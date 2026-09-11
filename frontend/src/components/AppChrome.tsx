"use client";

import type {ReactNode} from "react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {ClickSoundProvider} from "@/components/ClickSoundProvider";
import IslandNav from "@/components/IslandNav";
import {GithubIcon, XBrandIcon} from "@/components/icons";
import {isAppShellPath} from "@/lib/routes";

export function AppChrome({children}: {children: ReactNode}) {
  const pathname = usePathname();
  const app = isAppShellPath(pathname);
  const landing = pathname === "/";
  const studio = pathname.startsWith("/scratch");

  const mainWidth = landing || studio ? "max-w-7xl" : "max-w-5xl";
  const mainPad = studio
    ? "mx-auto w-full max-w-7xl flex-1 px-0 pb-10 pt-[4.75rem] sm:px-4 sm:pb-16 sm:pt-28"
    : app
      ? "mx-auto w-full max-w-5xl flex-1 px-0 pb-0 pt-[4.75rem] sm:px-4 sm:pb-16 sm:pt-28"
      : landing
        ? "mx-auto w-full max-w-7xl flex-1 px-5 pb-20 pt-24 sm:px-8 sm:pt-32"
        : "mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-24 sm:pt-32";

  return (
    <div className="flex min-h-dvh flex-col">
      <ClickSoundProvider />
      <IslandNav />
      <main className={mainPad}>{children}</main>
      <footer
        className={`mt-auto border-t border-fog/60 bg-transparent ${
          app ? "hidden sm:block" : ""
        }`}
      >
        <div
          className={`mx-auto flex flex-col items-center justify-between gap-5 px-4 py-8 sm:flex-row sm:py-9 ${mainWidth}`}
        >
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <Link
              href="/"
              className="flex items-center gap-2 opacity-90 transition-opacity hover:opacity-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logomark.png"
                alt=""
                className="h-7 w-7 rounded-[9px] ring-1 ring-ink/5"
                aria-hidden
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/wordmark.svg" alt="Hushh Protocol" className="h-4 w-auto" />
            </Link>
            <p className="text-xs tracking-[-0.01em] text-graphite">
              send silently. · on Arc
            </p>
          </div>
          <nav className="flex items-center gap-6 text-sm tracking-[-0.01em] text-graphite">
            <a
              href="/whitepaper.html"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-ink"
            >
              Whitepaper
            </a>
            <Link href="/privacy" className="transition-colors hover:text-ink">
              Privacy
            </Link>
            <Link
              href="/lookout"
              className="transition-colors hover:text-ink"
            >
              Lookout
            </Link>
            <a
              href="https://x.com/hushhprotocol"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Hushh Protocol on X"
              className="transition-colors hover:text-ink"
            >
              <XBrandIcon className="h-4 w-4" />
            </a>
            <a
              href="https://github.com/mdmudassir0143/HushProtcol"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Hushh Protocol on GitHub"
              className="transition-colors hover:text-ink"
            >
              <GithubIcon className="h-4 w-4" />
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
