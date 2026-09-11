"use client";

import {useState} from "react";
import {
  ConnectorAlreadyConnectedError,
  useAccount,
  useConnect,
  useDisconnect,
} from "wagmi";
import {arcTestnet} from "@/lib/chains";
import {toast} from "@/lib/toast";
import {useSignOut} from "@/hooks/useSignOut";
import {LoaderIcon, WalletIcon} from "@/components/icons";
import {
  SwitchNetworkButton,
  useIsCorrectChain,
} from "@/components/NetworkGate";

function pickConnector(
  connectors: ReturnType<typeof useConnect>["connectors"]
) {
  return (
    connectors.find((c) => c.id === "injected") ??
    connectors.find((c) => c.type === "injected") ??
    connectors[0]
  );
}

function shouldRetryConnect(err: unknown): boolean {
  if (err instanceof ConnectorAlreadyConnectedError) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return /already connected|connection already|resource unavailable|-32002/i.test(
    msg
  );
}

export function ConnectButton({
  label = "Connect wallet",
  className = "btn-primary",
  compact = false,
}: {
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  const {address, isConnected, status} = useAccount();
  const {connectAsync, connectors, isPending, error, reset} = useConnect();
  const {disconnectAsync, isPending: isDisconnecting} = useDisconnect();
  const {isCorrectChain} = useIsCorrectChain();
  const signOut = useSignOut();
  const [busyLocal, setBusyLocal] = useState(false);

  const busy =
    busyLocal ||
    isPending ||
    isDisconnecting ||
    status === "connecting" ||
    status === "reconnecting";

  async function handleSignOut() {
    setBusyLocal(true);
    try {
      await signOut({silent: compact, redirect: "/"});
    } catch (err) {
      if (!compact) toast.error(err);
    } finally {
      setBusyLocal(false);
    }
  }

  async function connectWallet() {
    const connector = pickConnector(connectors);
    if (!connector) {
      if (!compact) toast.error("No browser wallet found.");
      return;
    }

    setBusyLocal(true);
    reset();
    try {
      await connectAsync({connector, chainId: arcTestnet.id});
      if (!compact) toast.success("Wallet connected.");
    } catch (err) {
      if (shouldRetryConnect(err)) {
        try {
          await disconnectAsync().catch(() => undefined);
          reset();
          await connectAsync({connector, chainId: arcTestnet.id});
          if (!compact) toast.success("Wallet connected.");
          return;
        } catch (retryErr) {
          if (!compact) toast.error(retryErr);
          return;
        }
      }
      if (!compact) toast.error(err);
    } finally {
      setBusyLocal(false);
    }
  }

  if (isConnected && address && !isCorrectChain) {
    return (
      <SwitchNetworkButton
        compact={compact}
        className={compact ? className : "btn-primary"}
      />
    );
  }

  if (isConnected && address) {
    return (
      <button
        type="button"
        onClick={() => void handleSignOut()}
        disabled={busy}
        className={className}
        title="Sign out and disconnect wallet"
      >
        {busy ? <LoaderIcon className="h-4 w-4 animate-spin" /> : null}
        {compact ? "Sign out" : "Disconnect wallet"}
      </button>
    );
  }

  const connector = pickConnector(connectors);

  return (
    <>
      <button
        type="button"
        disabled={busy || !connector}
        onClick={() => void connectWallet()}
        className={className}
      >
        {busy ? (
          <LoaderIcon className="h-5 w-5 animate-spin" />
        ) : (
          !compact && <WalletIcon className="h-5 w-5" />
        )}
        {busy ? "Connecting…" : label}
      </button>
      {error && !compact ? (
        <p className="mt-2 text-center text-xs text-amber">{error.message}</p>
      ) : null}
    </>
  );
}
