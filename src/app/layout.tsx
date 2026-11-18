import type { Metadata, Viewport } from "next";
import {
  IBM_Plex_Mono,
  Libre_Baskerville,
  Plus_Jakarta_Sans,
} from "next/font/google";
import BakingShell from "@/components/BakingShell";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  weight: "variable",
  style: ["italic", "normal"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plus-jakarta-sans",
  fallback: ["Inter", "Helvetica"],
});

const libreBaskerville = Libre_Baskerville({
  weight: ["400", "700"],
  style: ["italic", "normal"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-libre-baskerville",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600", "700"],
  style: ["italic", "normal"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-ibm-plex-mono",
});

export const metadata: Metadata = {
  title: "baking | alexis wei",
  description: "a log of baking experiments",
  icons: {
    icon: [
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  viewportFit: "cover",
  // Stops iOS Safari zooming the page when a small (<16px) input is tapped.
  // iOS still allows pinch-zoom regardless of this.
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${plusJakartaSans.variable} ${libreBaskerville.variable} ${ibmPlexMono.variable} antialiased`}
      >
        <BakingShell>{children}</BakingShell>
      </body>
    </html>
  );
}
