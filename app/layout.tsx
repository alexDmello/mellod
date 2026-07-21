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
        {/* Inline script to restore cookies from localStorage in Android APK WebViews on app launch */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  if (typeof window !== 'undefined' && window.localStorage) {
                    var token = window.localStorage.getItem('sb-auth-token') || window.localStorage.getItem('mellod-auth-session');
                    if (!token) {
                      for (var i = 0; i < localStorage.length; i++) {
                        var k = localStorage.key(i);
                        if (k && (k.includes('auth-token') || k.startsWith('sb-'))) {
                          var val = localStorage.getItem(k);
                          if (val && val.includes('access_token')) {
                            token = val;
                            break;
                          }
                        }
                      }
                    }
                    if (token && !document.cookie.includes('sb-auth-token=')) {
                      document.cookie = 'sb-auth-token=' + encodeURIComponent(token) + '; path=/; max-age=31536000; SameSite=Lax';
                    }
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-gray-50 antialiased">
        <ServiceWorkerRegister />
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
