"use client";

import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

// Initialisation du client Convex
// La variable NEXT_PUBLIC_CONVEX_URL est injectée automatiquement par Convex lors du déploiement
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL || "http://localhost:3000");

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexAuthNextjsProvider client={convex}>{children}</ConvexAuthNextjsProvider>;
}


