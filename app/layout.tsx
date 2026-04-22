import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk, Geist } from "next/font/google";

import "@/app/globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap"
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL("https://deployhealthscanner.dev"),
  title: {
    default: "Deploy Health Scanner",
    template: "%s | Deploy Health Scanner"
  },
  description:
    "Continuous uptime, SSL expiry, SEO, and load-speed checks for every deployed project. Built for indie founders managing 5-50 production URLs.",
  keywords: [
    "website monitoring",
    "uptime monitoring",
    "ssl monitoring",
    "seo monitoring",
    "performance monitoring",
    "saas monitoring"
  ],
  openGraph: {
    title: "Deploy Health Scanner",
    description:
      "Monitor uptime, SSL, SEO, and page speed in one dashboard with 5-minute checks and instant alerts.",
    type: "website",
    url: "https://deployhealthscanner.dev",
    siteName: "Deploy Health Scanner"
  },
  twitter: {
    card: "summary_large_image",
    title: "Deploy Health Scanner",
    description:
      "Continuous health checks for your deployed projects: status, SSL, SEO, and speed."
  },
  alternates: {
    canonical: "/"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <body
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} bg-[#0d1117] text-slate-100 antialiased`}
        style={{
          fontFamily: "var(--font-space-grotesk), ui-sans-serif, system-ui"
        }}
      >
        {children}
      </body>
    </html>
  );
}
