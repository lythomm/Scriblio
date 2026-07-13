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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="fr">
        <body className={`${inter.className} bg-canvas-soft text-ink antialiased min-h-screen`}>
          <ConvexClientProvider>
            <AuthWrapper>{children}</AuthWrapper>
          </ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}





