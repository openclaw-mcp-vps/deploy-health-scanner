import type { Metadata } from "next";
import { Space_Grotesk, Source_Sans_3 } from "next/font/google";

import "@/app/globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

const body = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://deployhealthscanner.com"),
  title: {
    default: "Deploy Health Scanner",
    template: "%s | Deploy Health Scanner",
  },
  description:
    "Continuous uptime, SSL expiry, SEO metadata and page-speed checks for every deployed project. Get alerted by email or Slack before customers notice.",
  keywords: [
    "deployment monitoring",
    "uptime and SSL monitoring",
    "SEO monitoring",
    "page speed monitoring",
    "vercel monitoring",
    "netlify monitoring",
  ],
  openGraph: {
    title: "Deploy Health Scanner",
    description:
      "Continuous uptime + SSL + SEO + page-speed monitoring for indie founders shipping on Vercel and Netlify.",
    url: "https://deployhealthscanner.com",
    siteName: "Deploy Health Scanner",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Deploy Health Scanner",
    description:
      "Monitor your projects every 5 minutes with status, SSL, SEO and performance checks plus Slack and email alerts.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} bg-[#0d1117] antialiased`}>{children}</body>
    </html>
  );
}
