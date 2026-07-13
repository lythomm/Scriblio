"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ArrowLeft, Send, Loader2, MessageSquare, ArrowRight, ExternalLink } from "lucide-react";

interface SourceNote {
  id: string;
  summary: string;
  createdAt: number;
}

interface Message {
  role: "user" | "assistant";
  text: string;
  sources?: SourceNote[];
}

const SUGGESTIONS = [
  "Qu'ai-je de prévu cette semaine ?",
  "Quels sont mes rappels administratifs ?",
  "Résumé de mes dernières tâches",
];

export default function AskPage() {
  const [userId, setUserId] = useState<string>("");
  const askScriblioAction = useAction(api.actions.askScriblio);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Charger le userId depuis le localStorage au montage
  useEffect(() => {
    const storedId = localStorage.getItem("scriblio_user_id");
    if (storedId) {
      setUserId(storedId);
    }
  }, []);

  // Défilement automatique vers le bas lors de l'ajout de messages
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const handleSubmit = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading || !userId) return;
    
    const userQuery = textToSend.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userQuery }]);
    setIsLoading(true);

    try {
      const response = await askScriblioAction({ userId, query: userQuery });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: response.answer,
          sources: response.sources,
        },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Désolé, une erreur s'est produite lors de la génération de la réponse.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen bg-canvas font-sans antialiased text-ink flex flex-col overflow-hidden">
      
      {/* En-tête de la Page (Plein écran) */}
      <header className="h-16 px-4 md:px-8 border-b border-hairline bg-canvas shrink-0 flex items-center justify-between z-20 shadow-soft">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-3 py-1.5 hover:bg-canvas-soft rounded-md text-xs font-semibold text-ink-secondary transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Retour aux notes</span>
        </Link>
        
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-sticker-sky inline-block" />
          <h2 className="text-sm font-semibold uppercase tracking-eyebrow text-ink-muted">
            Assistant IA Scriblio
          </h2>
        </div>
      </header>

      {/* Zone de Chat Plein Écran */}
      <div className="flex-1 flex flex-col overflow-hidden bg-canvas-soft/10">
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 md:py-8 space-y-4">
          <div className="max-w-3xl mx-auto w-full h-full flex flex-col">
            
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col justify-center items-center text-center p-6 space-y-8 my-auto">
                <div className="w-14 h-14 rounded-full bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shadow-soft">
                  <MessageSquare size={26} />
                </div>
                
                <div className="space-y-2 max-w-md">
                  <p className="text-base font-bold text-ink-secondary">Posez une question à votre historique</p>
                  <p className="text-xs text-ink-faint font-sans leading-relaxed">
                    Scriblio analyse vos synthèses vocales pour formuler une réponse claire et référence automatiquement les notes associées.
                  </p>
                </div>

                {/* Suggestions chips en grille */}
                <div className="w-full max-w-2xl space-y-3">
                  <p className="text-[10px] text-ink-faint uppercase font-bold tracking-wider text-left pl-1">Suggestions</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {SUGGESTIONS.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSubmit(s)}
                        className="text-left py-3.5 px-4.5 rounded-xl border border-hairline bg-canvas hover:bg-canvas-soft text-xs text-ink-secondary font-semibold transition-all duration-150 flex items-center justify-between gap-3 group cursor-pointer shadow-soft hover:scale-[1.01] active:scale-[0.99]"
                      >
                        <span className="leading-snug">{s}</span>
                        <ArrowRight size={14} className="text-ink-faint group-hover:text-primary transition-colors shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 pb-6">
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${
                      m.role === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] px-4.5 py-3.5 rounded-xl text-sm leading-relaxed shadow-soft ${
                        m.role === "user"
                          ? "bg-primary text-white font-medium"
                          : "bg-canvas border border-hairline text-neutral-800 font-sans"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.text}</p>
                      
                      {/* Sources de la réponse */}
                      {m.role === "assistant" && m.sources && m.sources.length > 0 && (
                        <div className="mt-4 pt-3.5 border-t border-hairline space-y-2">
                          <p className="text-[10px] text-ink-faint uppercase tracking-wider font-bold">Notes associées :</p>
                          <div className="flex flex-wrap gap-2">
                            {m.sources.map((s, sIdx) => (
                              <Link
                                key={s.id}
                                href={`/?noteId=${s.id}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-canvas-soft border border-hairline text-xs font-semibold text-sky-850 hover:bg-sky-50 hover:border-sky-200 transition-colors cursor-pointer"
                              >
                                <ExternalLink size={10} />
                                <span>[Note {sIdx + 1}]</span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex items-center gap-2 text-xs text-ink-faint pl-2 animate-pulse">
                    <Loader2 className="animate-spin text-primary" size={14} />
                    <span>Scriblio formule une réponse...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Formulaire de saisie fixé en bas */}
        <div className="border-t border-hairline bg-canvas p-4 shrink-0">
          <div className="max-w-3xl mx-auto w-full">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit(input);
              }}
              className="flex gap-3 items-center"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                placeholder="Posez votre question sur vos notes vocales..."
                className="flex-1 px-4 py-3 bg-canvas-soft border border-hairline rounded-xl text-sm text-ink focus:outline-none focus:border-primary disabled:opacity-50 transition-all placeholder:text-ink-faint"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-3 rounded-xl bg-primary hover:bg-primary-active text-white disabled:bg-neutral-100 disabled:text-neutral-400 transition-colors cursor-pointer shadow-soft flex items-center justify-center active:scale-95"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>

      </div>

    </div>
  );
}
