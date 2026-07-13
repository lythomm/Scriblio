"use client";

// Ce composant est rendu EN DEHORS du layout racine (et donc hors de tout provider).
// Il ne doit utiliser aucun hook dépendant de Context (useTheme, useAuth, etc.).
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", margin: 0, backgroundColor: "#fafaf9", color: "#1c1917" }}>
        <div style={{ textAlign: "center", maxWidth: 420, padding: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Une erreur est survenue</h2>
          <p style={{ fontSize: 14, color: "#78716c", marginBottom: 24 }}>
            Scriblio a rencontré un problème inattendu.
          </p>
          <button
            onClick={() => reset()}
            style={{ padding: "10px 24px", fontSize: 14, fontWeight: 600, borderRadius: 8, border: "1px solid #e7e5e4", background: "#fff", cursor: "pointer" }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
