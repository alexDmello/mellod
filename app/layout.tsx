import type { Metadata, Viewport } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

// Using standard CSS font-family stack with Inter Google Font link fallback
const interVariable = "font-sans";

export const metadata: Metadata = {
  metadataBase: new URL("https://mellod.in"),
  title: "Mellod Biofuels — Authorized UCO Aggregator",
  description:
    "Mellod Biofuels is an authorized Used Cooking Oil (UCO) aggregator operating in partnership with FSSAI RUCO-registered NFP processing units across India.",
  keywords: ["UCO collection", "used cooking oil", "FSSAI RUCO partner", "Mellod Biofuels", "biodiesel feedstock"],
  authors: [{ name: "Mellod Biofuels" }],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", sizes: "64x64", type: "image/png" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mellod Biofuels",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "Mellod Biofuels — Authorized UCO Aggregator",
    description: "Authorized UCO aggregator partnered with FSSAI RUCO-registered NFP units — sustainable UCO collection & biodiesel feedstock supply.",
    url: "https://mellod.in",
    siteName: "Mellod Biofuels",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Mellod Biofuels Logo",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mellod Biofuels — Authorized UCO Aggregator",
    description: "Authorized UCO aggregator partnered with FSSAI RUCO-registered NFP units — sustainable UCO collection & biodiesel feedstock supply.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#022c22",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import DisableContextMenu from "@/components/DisableContextMenu";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-gray-50 font-sans">
      <head>
        <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#022c22" />
        <meta name="background-color" content="#f9fafb" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Mellod Biofuels",
              "url": "https://mellod.in",
              "logo": "https://mellod.in/logo.png",
              "image": "https://mellod.in/og-image.png",
              "description": "Authorized Used Cooking Oil (UCO) aggregator operating in partnership with FSSAI RUCO-registered NFP processing units.",
              "sameAs": [
                "https://mellod.in"
              ]
            })
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Mellod Biofuels",
              "url": "https://mellod.in"
            })
          }}
        />
      </head>
      <body className="min-h-screen bg-gray-50 antialiased selection:bg-emerald-600 selection:text-white">
        <DisableContextMenu />
        <ServiceWorkerRegister />
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
