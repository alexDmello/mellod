import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mellod — UCO Collection Platform",
  description:
    "Mellod is a technology-driven Used Cooking Oil (UCO) collection and logistics platform connecting restaurants, food businesses, and collection agents.",
  keywords: ["UCO collection", "used cooking oil", "cooking oil recycling", "Mellod"],
  authors: [{ name: "Mellod" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-screen bg-gray-50 antialiased">
        {children}
      </body>
    </html>
  );
}
