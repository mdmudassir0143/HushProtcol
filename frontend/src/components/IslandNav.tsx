"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {useAccount} from "wagmi";
import {APP_NAV_WIDTH} from "@/components/AppShell";
import {ConnectButton} from "@/components/ConnectButton";
import {UserAvatar} from "@/components/UserAvatar";
import {useSession} from "@/hooks/useSession";
import {profilePath} from "@/lib/routes";

function navActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function IslandNav() {
  const pathname = usePathname();
  const {address, isConnected} = useAccount();
  const {user, needsUsername, lookup} = useSession();
  // App tabs once the wallet is connected (not only after JWT sign-in).
  const showAppNav = isConnected;
  const username =
    user?.username ??
    (lookup?.username && lookup.username.length > 0 ? lookup.username : null);
  const profileHref =
    needsUsername || !username ? "/register" : profilePath(username);
  const profileActive =
    navActive(pathname, profileHref) ||
    navActive(pathname, "/account") ||
    navActive(pathname, "/register");

  function tab(
    href: string,
    label: string,
    opts?: {showOnMobile?: boolean}
  ) {
    const active = navActive(pathname, href);
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`relative shrink-0 rounded-full px-2.5 py-1.5 text-[13px] font-semibold tracking-[-0.01em] transition-all duration-200 sm:px-3.5 sm:py-2 sm:text-sm ${
          opts?.showOnMobile === false ? "hidden sm:inline-flex" : "inline-flex"
        } ${
          active
            ? "bg-paper text-ink shadow-[0_1px_0_rgba(255,255,255,0.5)_inset]"
            : "text-paper/80 hover:bg-white/[0.08] hover:text-paper"
        }`}
      >
        {label}
      </Link>
    );
  }

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:top-4 sm:px-4 sm:pt-0">
      <nav
        aria-label="Primary"
        className={`pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-ink/90 px-2.5 py-1.5 text-paper shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_12px_40px_-16px_rgba(10,10,10,0.55)] backdrop-blur-xl ${APP_NAV_WIDTH} sm:gap-3 sm:px-4 sm:py-2.5`}
      >
        <Link
          href="/"
          aria-current={pathname === "/" ? "page" : undefined}
          className={`flex shrink-0 items-center gap-2 rounded-full pl-0.5 pr-0.5 transition-opacity sm:pr-2 ${
            pathname === "/" ? "opacity-100" : "opacity-90 hover:opacity-100"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logomark.png"
            alt=""
            className="h-7 w-7 shrink-0 rounded-[9px] ring-1 ring-white/10"
            aria-hidden
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/wordmark.svg"
            alt="Hushh Protocol"
            className="hidden h-4 w-auto brightness-0 invert sm:block"
          />
        </Link>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-0.5 sm:gap-1.5">
          {showAppNav ? (
            <>
              {tab("/send", "Send")}
              {tab("/scratch", "Create Gift Card", {showOnMobile: false})}
              {tab("/inbox", "Inbox")}
              {tab("/lookout", "Lookout", {showOnMobile: false})}
              <Link
                href={profileHref}
                aria-current={profileActive ? "page" : undefined}
                title={username ? `@${username}` : "Claim username"}
                className={`relative inline-flex max-w-[8rem] shrink-0 items-center gap-1.5 rounded-full py-1 pl-1 pr-2 text-[13px] font-semibold tracking-[-0.01em] transition-all duration-200 sm:max-w-none sm:gap-2 sm:pr-3.5 sm:text-sm ${
                  profileActive
                    ? "bg-paper text-ink shadow-[0_1px_0_rgba(255,255,255,0.5)_inset]"
                    : "text-paper/80 hover:bg-white/[0.08] hover:text-paper"
                }`}
              >
                {address ? (
                  <UserAvatar address={address} size="sm" />
                ) : null}
                <span className="truncate">
                  {username ? `@${username}` : "Claim"}
                </span>
              </Link>
            </>
          ) : (
            <>{tab("/lookout", "Lookout")}</>
          )}

          <ConnectButton
            compact
            label="Connect"
            className="shrink-0 rounded-full border border-paper/20 bg-white/[0.04] px-2.5 py-1.5 text-[13px] font-medium tracking-[-0.01em] text-paper transition-all duration-200 hover:border-paper/35 hover:bg-white/[0.1] sm:px-3 sm:text-sm"
          />
        </div>
      </nav>
    </header>
  );
}
