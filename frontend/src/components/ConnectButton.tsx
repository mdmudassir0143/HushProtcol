"use client";

import {useState} from "react";
import {
  ConnectorAlreadyConnectedError,
  useAccount,
  useConnect,
  useDisconnect,
} from "wagmi";
import {useConnectWallet, usePrivy} from "@privy-io/react-auth";
import {arcTestnet} from "@/lib/chains";
import {toast} from "@/lib/toast";
import {useSignOut} from "@/hooks/useSignOut";
import {LoaderIcon, WalletIcon} from "@/components/icons";
import {
  SwitchNetworkButton,
  useIsCorrectChain,
} from "@/components/NetworkGate";
import {isPrivyConfigured} from "@/providers/PrivyAppProvider";

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

function ConnectButtonShell({
  address,
  isConnected,
  busy,
  compact,
  className,
  label,
  errorMessage,
  canConnect,
  onConnect,
  onSignOut,
}: {
  address?: string;
  isConnected: boolean;
  busy: boolean;
  compact: boolean;
  className: string;
  label: string;
  errorMessage?: string | null;
  canConnect: boolean;
  onConnect: () => void;
  onSignOut: () => void;
}) {
  const {isCorrectChain} = useIsCorrectChain();

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
        onClick={onSignOut}
        disabled={busy}
        className={className}
        title="Sign out and disconnect wallet"
      >
        {busy ? <LoaderIcon className="h-4 w-4 animate-spin" /> : null}
        {compact ? "Sign out" : "Disconnect wallet"}
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={busy || !canConnect}
        onClick={onConnect}
        className={className}
      >
        {busy ? (
          <LoaderIcon className="h-5 w-5 animate-spin" />
        ) : (
          !compact && <WalletIcon className="h-5 w-5" />
        )}
        {busy ? "Connecting…" : label}
      </button>
      {errorMessage && !compact ? (
        <p className="mt-2 text-center text-xs text-amber">{errorMessage}</p>
      ) : null}
    </>
  );
}

/** Privy modal: MetaMask, WalletConnect, detected wallets, etc. */
function PrivyConnectButton({
  label,
  className,
  compact,
}: {
  label: string;
  className: string;
  compact: boolean;
}) {
  const {address, isConnected, status} = useAccount();
  const {ready, authenticated, login} = usePrivy();
  const {connectWallet} = useConnectWallet({
    onSuccess: () => {
      if (!compact) toast.success("Wallet connected.");
    },
    onError: (err) => {
      if (compact) return;
      const code = String(err);
      if (/exited|user_exited|cancelled|canceled/i.test(code)) return;
      toast.error(code);
    },
  });
  const signOut = useSignOut();
  const [busyLocal, setBusyLocal] = useState(false);

  const busy =
    busyLocal || status === "connecting" || status === "reconnecting";

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

  function openWallet() {
    if (!ready) return;
    setBusyLocal(true);
    try {
      if (authenticated) {
        connectWallet({
          description: "Connect an Arc wallet to continue on Hushh.",
          walletChainType: "ethereum-only",
        });
      } else {
        login({
          loginMethods: ["wallet"],
          walletChainType: "ethereum-only",
        });
      }
    } catch (err) {
      if (!compact) toast.error(err);
    } finally {
      // Privy modal is async; clear local busy so the button stays usable.
      setBusyLocal(false);
    }
  }

  return (
    <ConnectButtonShell
      address={address}
      isConnected={isConnected}
      busy={busy || !ready}
      compact={compact}
      className={className}
      label={label}
      canConnect={ready}
      onConnect={openWallet}
      onSignOut={() => void handleSignOut()}
    />
  );
}

/** Injected MetaMask / browser wallet when Privy is not configured. */
function InjectedConnectButton({
  label,
  className,
  compact,
}: {
  label: string;
  className: string;
  compact: boolean;
}) {
  const {address, isConnected, status} = useAccount();
  const {connectAsync, connectors, isPending, error, reset} = useConnect();
  const {disconnectAsync, isPending: isDisconnecting} = useDisconnect();
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

  async function connectInjected() {
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

  return (
    <ConnectButtonShell
      address={address}
      isConnected={isConnected}
      busy={busy}
      compact={compact}
      className={className}
      label={label}
      errorMessage={error?.message}
      canConnect={!!pickConnector(connectors)}
      onConnect={() => void connectInjected()}
      onSignOut={() => void handleSignOut()}
    />
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
  if (isPrivyConfigured()) {
    return (
      <PrivyConnectButton
        label={label}
        className={className}
        compact={compact}
      />
    );
  }

  return (
    <InjectedConnectButton
      label={label}
      className={className}
      compact={compact}
    />
  );
}
