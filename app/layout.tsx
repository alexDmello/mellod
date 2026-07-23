import type { Metadata, Viewport } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

// Using standard CSS font-family stack with Inter Google Font link fallback
const interVariable = "font-sans";

export const metadata: Metadata = {
  title: "Mellod — UCO Collection Platform",
  description:
    "Mellod is a technology-driven Used Cooking Oil (UCO) collection and logistics platform connecting restaurants, food businesses, and collection agents.",
  keywords: ["UCO collection", "used cooking oil", "cooking oil recycling", "Mellod"],
  authors: [{ name: "Mellod" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mellod",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "Mellod — UCO Collection Platform",
    description: "Sustainable used cooking oil collection and logistics.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#15803d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={interVariable}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-screen bg-gray-50 antialiased">
        <ServiceWorkerRegister />
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
