"use client";

import {useAccount, useSwitchChain} from "wagmi";
import {arcTestnet} from "@/lib/chains";
import {toast} from "@/lib/toast";
import {GlobeIcon, LoaderIcon} from "@/components/icons";

export function useIsCorrectChain() {
  const {chainId, isConnected} = useAccount();
  return {
    isConnected,
    chainId,
    isCorrectChain: isConnected && chainId === arcTestnet.id,
    targetChainId: arcTestnet.id,
    targetName: arcTestnet.name,
  };
}

export function SwitchNetworkButton({
  className = "btn-primary",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const {isCorrectChain, isConnected, targetName} = useIsCorrectChain();
  const {switchChain, isPending, error} = useSwitchChain();

  if (!isConnected || isCorrectChain) return null;

  return (
    <>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          switchChain(
            {chainId: arcTestnet.id},
            {
              onSuccess: () => toast.success(`Switched to ${targetName}.`),
              onError: (err) => toast.error(err),
            }
          )
        }
        className={className}
      >
        {isPending ? (
          <LoaderIcon className="h-4 w-4 animate-spin" />
        ) : (
          !compact && <GlobeIcon className="h-4 w-4" />
        )}
        {isPending
          ? "Switching…"
          : compact
            ? "Switch network"
            : `Switch to ${targetName}`}
      </button>
      {error && !compact ? (
        <p className="mt-2 text-center text-xs text-amber">{error.message}</p>
      ) : null}
    </>
  );
}

/** Banner + switch CTA when wallet is on the wrong chain. */
export function NetworkGate({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const {isConnected, isCorrectChain, targetName} = useIsCorrectChain();

  if (!isConnected || isCorrectChain) {
    return <>{children}</>;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="rounded-xl border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-ink">
        <p className="font-medium">Wrong network</p>
        <p className="mt-1 text-graphite">
          Hushh Protocol runs on {targetName} (chain {arcTestnet.id}). Switch your wallet
          to continue.
        </p>
      </div>
      <SwitchNetworkButton />
    </div>
  );
}
