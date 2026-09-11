"use client";

import {PrivyProvider} from "@privy-io/react-auth";
import type {ReactNode} from "react";
import {PrivyLogoutBridge} from "@/components/PrivyLogoutBridge";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";

/**
 * Twitter-only Privy auth. Wallets stay on wagmi — Privy is just for X linking.
 */
export function PrivyAppProvider({children}: {children: ReactNode}) {
  if (!PRIVY_APP_ID) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["twitter"],
        appearance: {
          theme: "light",
          accentColor: "#0a0a0a",
          logo: "/logomark.png",
          showWalletLoginFirst: false,
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "off",
          },
        },
      }}
    >
      <PrivyLogoutBridge />
      {children}
    </PrivyProvider>
  );
}
