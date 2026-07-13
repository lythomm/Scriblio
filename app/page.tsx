"use client";

import React from "react";
import { useNotes } from "./hooks/useNotes";
import Sidebar from "./components/Sidebar";
import ToastContainer from "./components/ToastContainer";
import { Menu, Mic, Square, Loader2, Trash2, FileText, MessageSquare } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const notesApi = useNotes();

  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-canvas-soft font-sans antialiased text-ink">
      
      {/* Conteneur des Toasts de notifications */}
      <ToastContainer toasts={notesApi.toasts} />

      {/* Barre latérale : Menu de navigation */}
      <Sidebar
        isSidebarOpen={notesApi.isSidebarOpen}
        setIsSidebarOpen={notesApi.setIsSidebarOpen}
      />

      {/* Zone Centrale Principale */}
      <main className="flex-1 flex flex-col h-full bg-canvas-soft overflow-y-auto relative">
        
        {/* En-tête minimaliste avec bouton Hamburger pour mobile */}
        <header className="px-4 md:px-8 py-4 border-b border-hairline bg-canvas flex justify-between items-center shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => notesApi.setIsSidebarOpen(true)}
              className="p-1 md:hidden text-ink-muted hover:text-ink cursor-pointer"
            >
              <Menu size={22} />
            </button>
            
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-sticker-sky inline-block" />
              <h2 className="text-sm font-semibold uppercase tracking-eyebrow text-ink-muted">
                Tableau de Bord
              </h2>
            </div>
          </div>
        </header>

        {/* Espace d'enregistrement central (Premium et minimaliste) */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-xl mx-auto w-full">
          
          {notesApi.isProcessing ? (
            /* Mode Traitement */
            <div className="space-y-6 animate-fade-in flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-sky-50 border border-sky-100 flex items-center justify-center text-primary shadow-elevated relative">
                <Loader2 className="animate-spin text-primary" size={40} />
                <span className="absolute inset-0 rounded-full border-4 border-sky-200/30 border-t-primary animate-ping opacity-25" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-ink-secondary">Structuration de votre note...</h3>
                <p className="text-sm text-ink-faint font-sans">{notesApi.processingStep || "Analyse en cours par l'IA"}</p>
              </div>
            </div>
          ) : notesApi.isRecording ? (
            /* Mode Enregistrement */
            <div className="space-y-8 animate-fade-in flex flex-col items-center">
              <div className="text-5xl font-mono font-bold tracking-wider text-neutral-800 tabular-nums">
                {formatTime(notesApi.recordingDuration)}
              </div>
              
              {/* Onde audio animée premium */}
              <div className="flex items-end justify-center gap-1.5 h-16 w-60 px-4">
                <span className="w-1.5 h-6 rounded-full bg-red-500 animate-wave-1" />
                <span className="w-1.5 h-12 rounded-full bg-red-500 animate-wave-2" />
                <span className="w-1.5 h-16 rounded-full bg-red-500 animate-wave-3" />
                <span className="w-1.5 h-8 rounded-full bg-red-500 animate-wave-1" />
                <span className="w-1.5 h-14 rounded-full bg-red-500 animate-wave-2" />
                <span className="w-1.5 h-4 rounded-full bg-red-500 animate-wave-3" />
              </div>

              <div className="flex items-center gap-4">
                {/* Bouton Arrêter */}
                <button
                  onClick={notesApi.stopRecording}
                  className="px-8 py-4 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-elevated cursor-pointer hover:scale-105 active:scale-95 transition-all duration-150"
                >
                  <Square size={16} fill="white" />
                  <span>Arrêter et Sauvegarder</span>
                </button>

                {/* Bouton Annuler */}
                <button
                  onClick={notesApi.cancelRecording}
                  title="Annuler l'enregistrement"
                  className="w-14 h-14 rounded-full bg-canvas border border-hairline text-ink-muted hover:text-red-650 hover:bg-red-50 hover:border-red-200 transition-all duration-150 cursor-pointer shadow-soft flex items-center justify-center hover:scale-105 active:scale-95"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ) : (
            /* Mode Prêt à enregistrer */
            <div className="space-y-8 animate-fade-in flex flex-col items-center">
              <div className="relative group cursor-pointer">
                {/* Anneaux de pulsation soft en arrière-plan */}
                <span className="absolute -inset-4 rounded-full bg-primary/5 group-hover:bg-primary/10 transition-all duration-300 animate-pulse" />
                <span className="absolute -inset-8 rounded-full bg-primary/2 group-hover:bg-primary/5 transition-all duration-500 animate-pulse delay-75" />
                
                {/* Grand bouton micro central */}
                <button
                  onClick={notesApi.startRecording}
                  title="Enregistrer ma voix"
                  className="w-32 h-32 rounded-full bg-primary hover:bg-primary-active text-white flex items-center justify-center shadow-elevated transition-all duration-300 hover:scale-105 active:scale-95 relative z-10"
                >
                  <Mic size={48} className="transition-transform group-hover:scale-110" />
                </button>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-ink-secondary">Enregistrez vos idées</h3>
                <p className="text-sm text-ink-faint font-sans leading-relaxed max-w-sm">
                  Parlez naturellement. L'IA se charge de retranscrire, résumer et structurer votre note vocale sous forme de tâches exploitables.
                </p>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <Link
                  href="/notes"
                  className="px-5 py-2.5 border border-hairline hover:bg-canvas-soft rounded-full text-xs font-bold text-ink-secondary flex items-center gap-2 transition-all cursor-pointer shadow-soft active:scale-95 shrink-0"
                >
                  <FileText size={14} className="text-ink-muted" />
                  <span>Mes notes</span>
                </Link>
                <Link
                  href="/ask"
                  className="px-5 py-2.5 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-850 rounded-full text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-soft active:scale-95 shrink-0"
                >
                  <MessageSquare size={14} className="text-sky-700" />
                  <span>Poser une question</span>
                </Link>
              </div>
            </div>
          )}

        </div>
      </main>

    </div>
  );
}
