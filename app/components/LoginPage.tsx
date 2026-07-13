"use client";

import React, { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import Button from "./Button";
import { Loader2, Mic } from "lucide-react";

export default function LoginPage() {
  const { signIn } = useAuthActions();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signIn("password", {
        email,
        password,
        flow: isSignUp ? "signUp" : "signIn",
      });
    } catch (err: any) {
      console.error("Auth error:", err);
      // Extraire un message d'erreur lisible
      const msg = err.message || "";
      if (msg.includes("invalid_credentials") || msg.toLowerCase().includes("credentials")) {
        setError("Identifiants incorrects. Veuillez réessayer.");
      } else if (msg.includes("already_exists") || msg.toLowerCase().includes("exists")) {
        setError("Cet email est déjà associé à un compte.");
      } else if (password.length < 8 && isSignUp) {
        setError("Le mot de passe doit contenir au moins 8 caractères.");
      } else {
        setError("Une erreur est survenue. Veuillez réessayer.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas-soft px-4 py-12 font-sans antialiased text-ink">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-hairline bg-canvas p-8 shadow-soft">
        
        {/* Logo / Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-white shadow-elevated">
            <Mic size={24} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              {isSignUp ? "Créer un compte Scriblio" : "Bienvenue sur Scriblio"}
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              {isSignUp 
                ? "Commencez à structurer vos idées vocales" 
                : "Connectez-vous pour accéder à vos notes"
              }
            </p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 animate-fade-in">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Adresse email
            </label>
            <input
              id="email"
              type="email"
              required
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nom@exemple.com"
              className="w-full px-3 py-2.5 rounded-lg border border-hairline bg-canvas text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              required
              disabled={loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 rounded-lg border border-hairline bg-canvas text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            variant="primary"
            className="w-full py-2.5 mt-2 font-semibold"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin text-white" />
                <span>Chargement...</span>
              </>
            ) : (
              <span>{isSignUp ? "S'inscrire" : "Se connecter"}</span>
            )}
          </Button>
        </form>

        {/* Toggle Sign Up / Sign In */}
        <div className="text-center pt-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
            }}
            className="text-xs font-medium text-primary hover:text-primary-active focus:outline-none transition-colors cursor-pointer"
          >
            {isSignUp 
              ? "Vous avez déjà un compte ? Connectez-vous" 
              : "Nouveau sur Scriblio ? Créez un compte"
            }
          </button>
        </div>

      </div>
    </div>
  );
}
