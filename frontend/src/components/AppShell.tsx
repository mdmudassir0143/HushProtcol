import type {ReactNode} from "react";

/** Max width for phone-frame app screens (cards). */
export const APP_CHROME_WIDTH = "w-full max-w-3xl";

/** Island nav is intentionally wider than the screen cards. */
export const APP_NAV_WIDTH = "w-full max-w-4xl";

/**
 * Phone-screen shell: same width as the island nav header.
 * Full-bleed on mobile; framed card on larger screens.
 */
export function AppShell({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className={`animate-fade mx-auto h-full ${APP_CHROME_WIDTH}`}>
      <div className="flex min-h-[calc(100dvh-5rem)] flex-col overflow-hidden border-ink/[0.08] bg-white/95 backdrop-blur-sm max-sm:border-y sm:min-h-[min(44rem,calc(100dvh-10rem))] sm:rounded-[2rem] sm:border">
        <div
          className="hidden shrink-0 justify-center border-b border-fog/80 bg-gradient-to-b from-paper/80 to-transparent px-3 py-2.5 sm:flex"
          aria-hidden
        >
          <span className="h-1 w-14 rounded-full bg-ink/10" />
        </div>

        <div className="flex flex-1 flex-col px-4 pb-5 pt-5 sm:px-7 sm:pb-5 sm:pt-7">
          <header className="mb-5 space-y-1.5 text-left sm:mb-6 sm:space-y-2">
            <h1 className="text-[1.7rem] font-bold tracking-[-0.03em] sm:text-[1.9rem]">
              {title}
            </h1>
            {subtitle ? (
              <p className="max-w-prose text-[13px] leading-relaxed text-graphite sm:text-sm">
                {subtitle}
              </p>
            ) : null}
          </header>

          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </div>

        <div
          className="flex shrink-0 justify-center pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 sm:pb-3"
          aria-hidden
        >
          <span className="h-1 w-24 rounded-full bg-ink/10" />
        </div>
      </div>
    </div>
  );
}
