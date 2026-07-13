import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { AuthWrapper } from "./AuthWrapper";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";

const inter = Inter({ subsets: ["latin"] });

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Scriblio.AI - Vos notes vocales structurées par l'IA",
  description: "Transformez vos pensées orales décousues en résumés clairs, plans d'action et brouillons d'emails en un clic.",
  manifest: "/manifest.json",
  themeColor: "#1e293b",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Scriblio",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="fr">
        <head>
          <link rel="apple-touch-icon" href="/icon-192x192.png" />
        </head>
        <body className={`${inter.className} bg-canvas-soft text-ink antialiased min-h-screen`}>
          <ConvexClientProvider>
            <AuthWrapper>{children}</AuthWrapper>
          </ConvexClientProvider>
          <div className="landscape-lock" aria-live="assertive">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3" />
            </svg>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 600 }}>
              Veuillez tourner votre appareil en mode portrait
            </p>
            <p style={{ color: 'var(--color-ink-muted)', fontSize: '0.875rem' }}>
              Scriblio est optimisé pour une utilisation en portrait.
            </p>
          </div>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', () => {
                    navigator.serviceWorker.register('/sw.js');
                  });
                }
                if (screen.orientation && screen.orientation.lock) {
                  screen.orientation.lock('portrait').catch(() => {});
                }
              `,
            }}
          />
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}





