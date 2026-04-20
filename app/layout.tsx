import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://deployhealthscanner.com"),
  title: "Deploy Health Scanner | Uptime, SSL, SEO, and Speed Monitoring",
  description:
    "Deploy Health Scanner checks uptime, SSL expiry, SEO metadata, and page speed every 5 minutes so founders catch issues before customers do.",
  openGraph: {
    title: "Deploy Health Scanner",
    description:
      "Continuous uptime + SSL + SEO + load-speed checks across all deployed projects.",
    url: "https://deployhealthscanner.com",
    siteName: "Deploy Health Scanner",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Deploy Health Scanner",
    description:
      "Monitor uptime, SSL expiry, SEO tags, and speed in one dashboard. Built for indie founders.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-[var(--background)] text-[var(--text)] antialiased">
        <Script src="https://app.lemonsqueezy.com/js/lemon.js" strategy="afterInteractive" />
        {children}
      </body>
    </html>
  );
}
