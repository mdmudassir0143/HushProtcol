import {defineChain} from "viem";

const rpcUrl =
  process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.testnet.arc.network";
const explorerUrl =
  process.env.NEXT_PUBLIC_EXPLORER_URL || "https://testnet.arcscan.app";

/** Arc Testnet (chainId 5042002) */
export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: {name: "USDC", symbol: "USDC", decimals: 18},
  rpcUrls: {
    default: {
      http: [rpcUrl],
      webSocket: ["wss://rpc.testnet.arc.network"],
    },
  },
  blockExplorers: {
    default: {name: "ArcScan", url: explorerUrl},
  },
  testnet: true,
});
