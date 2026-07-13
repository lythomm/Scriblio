"use client";

import React from "react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-canvas-soft text-ink font-sans">
      <h2 className="text-xl font-bold mb-2">Page non trouvée</h2>
      <p className="text-sm text-ink-muted mb-6">La page que vous recherchez n'existe pas.</p>
      <Link href="/" className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-active transition-colors">
        Retour à l'accueil
      </Link>
    </div>
  );
}
