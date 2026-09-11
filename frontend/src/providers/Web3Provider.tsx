"use client";

import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {type ReactNode, useState} from "react";
import {WagmiProvider} from "wagmi";
import {AppLoader} from "@/components/AppLoader";
import {AuthSync} from "@/components/AuthSync";
import {ToastHost} from "@/components/ToastHost";
import {PrivyAppProvider} from "@/providers/PrivyAppProvider";
import {wagmiConfig} from "@/lib/wagmi";

export function Web3Provider({children}: {children: ReactNode}) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <PrivyAppProvider>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <AppLoader />
          <AuthSync />
          {children}
          <ToastHost />
        </QueryClientProvider>
      </WagmiProvider>
    </PrivyAppProvider>
  );
}
