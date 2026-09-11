/** Trim an EVM address for UI display (keeps full value for copy/explorer). */
export function shortAddr(addr?: string | null): string {
  if (!addr) return "—";
  const a = addr.trim();
  if (a.length < 12) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
