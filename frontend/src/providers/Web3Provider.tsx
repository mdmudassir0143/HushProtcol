"use client";

import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {type ReactNode, useState} from "react";
import {WagmiProvider as WagmiProviderCore} from "wagmi";
import {WagmiProvider as PrivyWagmiProvider} from "@privy-io/wagmi";
import {AppLoader} from "@/components/AppLoader";
import {AuthSync} from "@/components/AuthSync";
import {ToastHost} from "@/components/ToastHost";
import {
  PrivyAppProvider,
  isPrivyConfigured,
} from "@/providers/PrivyAppProvider";
import {wagmiConfig, wagmiInjectedConfig} from "@/lib/wagmi";

function AppChrome({children}: {children: ReactNode}) {
  return (
    <>
      <AppLoader />
      <AuthSync />
      {children}
      <ToastHost />
    </>
  );
}

export function Web3Provider({children}: {children: ReactNode}) {
  const [queryClient] = useState(() => new QueryClient());

  if (!isPrivyConfigured()) {
    return (
      <WagmiProviderCore config={wagmiInjectedConfig}>
        <QueryClientProvider client={queryClient}>
          <AppChrome>{children}</AppChrome>
        </QueryClientProvider>
      </WagmiProviderCore>
    );
  }

  return (
    <PrivyAppProvider>
      <QueryClientProvider client={queryClient}>
        <PrivyWagmiProvider config={wagmiConfig}>
          <AppChrome>{children}</AppChrome>
        </PrivyWagmiProvider>
      </QueryClientProvider>
    </PrivyAppProvider>
  );
}
