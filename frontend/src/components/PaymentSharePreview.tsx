import type {PaymentShareDetails} from "@/lib/sharePayment";

const HUSH_HANDLE = "@hushhprotocol";

/** Presentational preview shown in the success modal (not the export canvas). */
export function PaymentSharePreview({
  details,
}: {
  details: PaymentShareDetails;
}) {
  const from = details.fromUsername
    ? `@${details.fromUsername.replace(/^@/, "")}`
    : details.kind === "claimed"
      ? "Private"
      : "—";
  const eyebrow =
    details.kind === "claimed" ? "PAYMENT CLAIMED" : "PAYMENT SENT";

  return (
    <div className="overflow-hidden rounded-2xl border border-fog bg-gradient-to-br from-[#f7f5f1] via-white to-[#efeae4] p-4 text-left">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logomark.png"
            alt=""
            className="h-8 w-8 rounded-[9px] ring-1 ring-ink/5"
          />
          <div className="min-w-0">
            <p className="text-sm font-bold tracking-tight text-ink">
              Hushh Protocol
            </p>
            <p className="text-[11px] text-graphite">{HUSH_HANDLE}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/arc-logo.png"
            alt="Arc"
            className="h-8 w-8 rounded-[9px] ring-1 ring-ink/5"
          />
          <span className="text-[10px] font-medium text-graphite">Arc</span>
        </div>
      </div>

      <p className="mt-4 font-mono text-[10px] font-semibold tracking-[0.14em] text-graphite">
        {eyebrow}
      </p>
      <p className="mt-1 flex items-baseline gap-2">
        <span className="text-3xl font-extrabold tracking-tight text-ink">
          {details.amount}
        </span>
        <span className="text-base font-semibold text-graphite">
          {details.tokenSymbol}
        </span>
        {details.tokenLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={details.tokenLogo}
            alt=""
            className="h-5 w-5 rounded-full"
          />
        ) : null}
      </p>

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-t border-fog/80 pt-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-graphite">
            From
          </p>
          <p className="truncate text-sm font-semibold text-ink">{from}</p>
        </div>
        <span className="text-signal" aria-hidden>
          →
        </span>
        <div className="min-w-0 text-right">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-graphite">
            To
          </p>
          <p className="truncate text-sm font-semibold text-ink">
            {details.toLabel}
          </p>
        </div>
      </div>
    </div>
  );
}
