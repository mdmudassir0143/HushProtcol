"use client";

import {PrivyProvider, type PrivyClientConfig} from "@privy-io/react-auth";
import type {ReactNode} from "react";
import {PrivyLogoutBridge} from "@/components/PrivyLogoutBridge";
import {arcTestnet} from "@/lib/chains";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";
const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

export const privyConfig: PrivyClientConfig = {
  loginMethods: ["wallet", "twitter"],
  defaultChain: arcTestnet,
  supportedChains: [arcTestnet],
  ...(WALLETCONNECT_PROJECT_ID
    ? {walletConnectCloudProjectId: WALLETCONNECT_PROJECT_ID}
    : {}),
  appearance: {
    theme: "light",
    accentColor: "#0a0a0a",
    logo: "/logomark.png",
    showWalletLoginFirst: true,
    walletChainType: "ethereum-only",
    walletList: [
      "detected_ethereum_wallets",
      "metamask",
      "rainbow",
      "coinbase_wallet",
      "wallet_connect",
    ],
  },
  embeddedWallets: {
    ethereum: {
      createOnLogin: "off",
    },
  },
};

/**
 * Privy auth + external wallet connection. Wagmi stays in sync via @privy-io/wagmi.
 * Twitter remains available for username claims / linking.
 */
export function PrivyAppProvider({children}: {children: ReactNode}) {
  if (!PRIVY_APP_ID) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider appId={PRIVY_APP_ID} config={privyConfig}>
      <PrivyLogoutBridge />
      {children}
    </PrivyProvider>
  );
}

export function isPrivyConfigured() {
  return Boolean(PRIVY_APP_ID);
}
