import {http, createConfig, injected} from "wagmi";
import {arcTestnet} from "@/lib/chains";

/**
 * Injected-only (MetaMask / browser wallets).
 * Do not import from `wagmi/connectors`: that barrel pulls Coinbase CDP → broken @x402.
 */
export const wagmiConfig = createConfig({
  chains: [arcTestnet],
  connectors: [injected({shimDisconnect: true})],
  transports: {
    [arcTestnet.id]: http(arcTestnet.rpcUrls.default.http[0]),
  },
  ssr: true,
});
