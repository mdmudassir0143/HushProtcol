import {http, createConfig as createWagmiConfig, injected} from "wagmi";
import {createConfig} from "@privy-io/wagmi";
import {arcTestnet} from "@/lib/chains";

const transports = {
  [arcTestnet.id]: http(arcTestnet.rpcUrls.default.http[0]),
} as const;

/**
 * Privy-driven wagmi config (no manual connectors — Privy syncs wallets).
 * Use only inside PrivyProvider + @privy-io/wagmi WagmiProvider.
 */
export const wagmiConfig = createConfig({
  chains: [arcTestnet],
  transports,
  ssr: true,
});

/**
 * Fallback when NEXT_PUBLIC_PRIVY_APP_ID is unset.
 * Injected-only — do not import from `wagmi/connectors` (Coinbase CDP / @x402 breakage).
 */
export const wagmiInjectedConfig = createWagmiConfig({
  chains: [arcTestnet],
  connectors: [injected({shimDisconnect: true})],
  transports,
  ssr: true,
});
