"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Send, Loader2, MessageSquare, ArrowRight, ExternalLink, Menu } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Button from "../components/Button";

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

// Helper simple pour parser le gras (**), l'italique (*) et les listes
const renderMarkdown = (text: string) => {
  const lines = text.split("\n");
  
  return lines.map((line, lineIdx) => {
    // Détection des puces (* ou -)
    const bulletMatch = line.match(/^(\s*)[*-]\s+(.*)$/);
    
    // Remplacement du gras (**) et de l'italique (*)
    const formatText = (str: string) => {
      // 1. Découpage du gras
      const boldParts = str.split(/\*\*([^*]+)\*\*/g);
      return boldParts.map((boldPart, bIdx) => {
        const isBold = bIdx % 2 === 1;

        // 2. Découpage de l'italique dans chaque segment
        const italicParts = boldPart.split(/\*([^*]+)\*/g);
        const renderedItalics = italicParts.map((italicPart, iIdx) => {
          const isItalic = iIdx % 2 === 1;
          if (isItalic) {
            return <em key={iIdx} className="italic text-ink-muted">{italicPart}</em>;
          }
          return italicPart;
        });

        if (isBold) {
          return <strong key={bIdx} className="font-bold text-ink">{renderedItalics}</strong>;
        }
        return <React.Fragment key={bIdx}>{renderedItalics}</React.Fragment>;
      });
    };

    if (bulletMatch) {
      const content = bulletMatch[2];
      return (
        <li key={lineIdx} className="list-disc ml-5 mb-1 text-sm leading-relaxed">
          {formatText(content)}
        </li>
      );
    }

    return (
      <p key={lineIdx} className="mb-2 text-sm leading-relaxed min-h-[1rem]">
        {formatText(line)}
      </p>
    );
  });
};

export default function AskPage() {
  const [userId, setUserId] = useState<string>("");
  const askScriblioAction = useAction(api.actions.askScriblio);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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

    // Initialiser le message vide de l'assistant dans la liste de discussion
    setMessages((prev) => [
      ...prev,
      { role: "assistant", text: "", sources: [] }
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, query: userQuery }),
      });

      if (!response.ok) {
        throw new Error("Erreur serveur lors de la requête de chat");
      }

      if (!response.body) {
        throw new Error("Aucun flux de réponse reçu");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let assistantText = "";
      let parsedSources: SourceNote[] = [];

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value);
          
          // Détection des métadonnées de sources transmises dans le premier chunk
          if (chunk.startsWith("__SOURCES__:")) {
            const newlineIndex = chunk.indexOf("\n");
            if (newlineIndex !== -1) {
              const headerStr = chunk.slice(12, newlineIndex);
              try {
                const headerData = JSON.parse(headerStr);
                parsedSources = headerData.sources || [];
              } catch (e) {
                console.error("Erreur de parsing des sources:", e);
              }
              const remainingText = chunk.slice(newlineIndex + 1);
              if (remainingText) {
                assistantText += remainingText;
              }
            }
          } else {
            assistantText += chunk;
          }

          // Mise à jour progressive du texte du message dans l'interface
          setMessages((prev) => {
            const updated = [...prev];
            const lastMessage = updated[updated.length - 1];
            if (lastMessage && lastMessage.role === "assistant") {
              lastMessage.text = assistantText;
              lastMessage.sources = parsedSources;
            }
            return updated;
          });
        }
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => {
        const updated = [...prev];
        const lastMessage = updated[updated.length - 1];
        if (lastMessage && lastMessage.role === "assistant") {
          lastMessage.text = "Désolé, une erreur s'est produite lors de la génération de la réponse.";
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-canvas-soft font-sans antialiased text-ink">
      
      {/* Barre latérale : Menu de navigation */}
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      {/* Zone Centrale Principale */}
      <main className="flex-1 flex flex-col h-full bg-canvas-soft overflow-hidden relative">
        
        {/* En-tête minimaliste avec bouton Hamburger pour mobile */}
        <header className="px-4 md:px-8 py-4 border-b border-hairline bg-canvas flex justify-between items-center shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-1 md:hidden text-ink-muted hover:text-ink cursor-pointer"
            >
              <Menu size={22} />
            </button>
            
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-sticker-sky inline-block" />
              <h2 className="text-sm font-semibold uppercase tracking-eyebrow text-ink-muted">
                Assistant IA Scriblio
              </h2>
            </div>
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
                  <h3 className="text-lg font-bold text-ink-secondary">Posez une question à votre historique</h3>
                  <p className="text-xs text-ink-faint font-sans leading-relaxed">
                    Scriblio analyse vos synthèses vocales pour formuler une réponse claire et référence automatiquement les notes associées.
                  </p>
                </div>

                {/* Suggestions chips en grille */}
                <div className="w-full max-w-2xl space-y-3">
                  <h4 className="text-[10px] text-ink-faint uppercase font-bold tracking-wider text-left pl-1">Suggestions</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {SUGGESTIONS.map((s, idx) => (
                      <Button
                        key={idx}
                        onClick={() => handleSubmit(s)}
                        className="text-left justify-between w-full"
                      >
                        <span className="leading-snug">{s}</span>
                        <ArrowRight size={14} className="text-ink-faint group-hover:text-primary transition-colors shrink-0" />
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 pb-6">
                {messages.map((m, idx) => {
                  if (m.role === "assistant" && !m.text.trim()) {
                    return null;
                  }
                  return (
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
                      {m.role === "user" ? (
                        <p className="whitespace-pre-wrap">{m.text}</p>
                      ) : (
                        <div className="space-y-1 font-editorial">
                          {renderMarkdown(m.text)}
                        </div>
                      )}
                      
                      {/* Sources de la réponse */}
                      {m.role === "assistant" && m.sources && m.sources.length > 0 && m.text.trim() && !isLoading && (
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
                );
              })}
                
                {isLoading && (
                  <div className="flex items-center gap-2 text-xs text-ink-faint pl-2 animate-pulse">
                    <Loader2 className="animate-spin text-primary" size={14} />
                    <span>Scriblio fouille les notes...</span>
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
    </main>
  </div>
  );
}
