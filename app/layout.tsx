import type { Metadata } from "next";
import Script from "next/script";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";

import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://deployhealthscanner.com";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Deploy Health Scanner | Uptime, SSL, SEO & Performance",
    template: "%s | Deploy Health Scanner",
  },
  description:
    "Continuous uptime, SSL expiry, SEO tag, and page speed checks every 5 minutes for indie founders managing production projects.",
  openGraph: {
    title: "Deploy Health Scanner",
    description:
      "One place for uptime, SSL, SEO, and speed checks across every deployed project.",
    url: appUrl,
    siteName: "Deploy Health Scanner",
    images: [
      {
        url: "/og.svg",
        width: 1200,
        height: 630,
        alt: "Deploy Health Scanner dashboard preview",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Deploy Health Scanner",
    description:
      "Monitor uptime, SSL, SEO, and performance on every URL you ship.",
    images: ["/og.svg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${spaceGrotesk.variable} ${plexMono.variable} antialiased`}>
        <Script src="https://app.lemonsqueezy.com/js/lemon.js" strategy="afterInteractive" />
        {children}
      </body>
    </html>
  );
}
