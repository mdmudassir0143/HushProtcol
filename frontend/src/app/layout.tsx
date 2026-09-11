import type {Metadata, Viewport} from "next";
import {Geist_Mono, Plus_Jakarta_Sans} from "next/font/google";
import {AppChrome} from "@/components/AppChrome";
import {Web3Provider} from "@/providers/Web3Provider";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans-ui",
  weight: ["400", "500", "600", "700", "800"],
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Hushh Protocol · send silently.",
  description:
    "ZK-private USDC payments on Arc. Deposit a note, withdraw with a Groth16 proof. Nothing on-chain connects the two.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body
        className={`${sans.variable} ${geistMono.variable} paper-surface min-h-dvh font-sans text-ink antialiased`}
      >
        <Web3Provider>
          <AppChrome>{children}</AppChrome>
        </Web3Provider>
      </body>
    </html>
  );
}
