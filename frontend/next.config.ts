import type {NextConfig} from "next";

const isDev = process.env.NODE_ENV !== "production";

function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

const connectSrc = [
  "'self'",
  originOf(process.env.NEXT_PUBLIC_RPC_URL),
  originOf(process.env.NEXT_PUBLIC_BACKEND_URL),
  originOf(process.env.NEXT_PUBLIC_INDEXER_URL),
  // Always allow local backend / indexer during development.
  ...(isDev
    ? [
        "http://127.0.0.1:4020",
        "http://localhost:4020",
        "http://127.0.0.1:4010",
        "http://localhost:4010",
      ]
    : []),
  "https://rpc.testnet.arc.network",
  "https://arc-testnet.drpc.org",
  "https://hush-protocol-backend.onrender.com",
  "https://hush-protocol-indexer.onrender.com",
  "https://*.walletconnect.com",
  "https://*.walletconnect.org",
  "wss://*.walletconnect.com",
  "wss://*.walletconnect.org",
  "https://api.web3modal.org",
  "https://*.web3modal.org",
  "https://pulse.walletconnect.org",
  "https://rpc.walletconnect.org",
  // Privy (Twitter OAuth)
  "https://auth.privy.io",
  "https://*.privy.io",
  "https://api.privy.io",
  "https://privy.auth0.com",
  "https://explorer-api.walletconnect.com",
  isDev ? "ws:" : null,
  isDev ? "wss:" : null,
].filter(Boolean);

const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  "'wasm-unsafe-eval'",
  isDev ? "'unsafe-eval'" : null,
].filter(Boolean);

const csp = [
  `default-src 'self'`,
  `script-src ${scriptSrc.join(" ")}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https:`,
  `font-src 'self' data:`,
  `connect-src ${connectSrc.join(" ")}`,
  `worker-src 'self' blob:`,
  `frame-src 'self' https://verify.walletconnect.com https://verify.walletconnect.org https://secure.walletconnect.com https://secure.walletconnect.org https://auth.privy.io https://*.privy.io`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `object-src 'none'`,
].join("; ");

const securityHeaders = [
  {key: "Content-Security-Policy", value: csp},
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {key: "X-Frame-Options", value: "DENY"},
  {key: "X-Content-Type-Options", value: "nosniff"},
  {key: "Referrer-Policy", value: "strict-origin-when-cross-origin"},
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  transpilePackages: ["@bullet/sdk", "@privy-io/react-auth"],
  webpack: (config, {isServer, webpack}) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
      stream: false,
      os: false,
      util: false,
      buffer: false,
    };
    // Browser: strip `node:` scheme so fallbacks apply (@bullet/sdk proof.ts).
    if (!isServer) {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /^node:/,
          (resource: {request: string}) => {
            resource.request = resource.request.replace(/^node:/, "");
          },
        ),
      );
    }
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    return config;
  },
  async headers() {
    return [{source: "/:path*", headers: securityHeaders}];
  },
};

export default nextConfig;
