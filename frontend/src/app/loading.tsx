export default function Loading() {
  return (
    <div className="flex min-h-[50svh] flex-col items-center justify-center gap-5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logomark.png"
        alt=""
        width={96}
        height={96}
        className="h-20 w-20 rounded-2xl bg-white object-cover ring-1 ring-ink/5 sm:h-24 sm:w-24"
      />
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-graphite">
        Loading
      </p>
    </div>
  );
}
