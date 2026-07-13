"use client";

import React from "react";
import { useNotes } from "./hooks/useNotes";
import Sidebar from "./components/Sidebar";
import ToastContainer from "./components/ToastContainer";
import { Menu, Mic, Square, Loader2, Trash2, FileText, MessageSquare } from "lucide-react";
import Button from "./components/Button";

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
            <div className="space-y-8 animate-fade-in flex flex-col items-center w-full">

              {/* Conteneur du bouton micro actif */}
              <div className="relative group">
                {/* Anneaux de pulsation rouges actifs en arrière-plan */}
                <span className="absolute -inset-4 rounded-full bg-secondary/5 animate-pulse" />
                <span className="absolute -inset-8 rounded-full bg-secondary/2 animate-pulse delay-75" />

                {/* Grand bouton rouge central (agrandi de 1.5x) */}
                <button
                  onClick={notesApi.stopRecording}
                  title="Arrêter et sauvegarder l'enregistrement"
                  className="w-48 h-48 rounded-full bg-secondary hover:bg-secondary/90 text-white flex items-center justify-center shadow-elevated transition-all duration-300 hover:scale-105 active:scale-95 relative z-10 cursor-pointer"
                >
                  <Square size={48} fill="white" className="animate-pulse" />
                </button>
              </div>

              {/* Infos d'enregistrement */}
              <div className="flex flex-col items-center gap-4">
                <div className="text-4xl font-mono font-bold tracking-wider text-ink-secondary tabular-nums">
                  {formatTime(notesApi.recordingDuration)}
                </div>

                {/* Bouton Annuler classique en dessous */}
                <Button
                  onClick={notesApi.cancelRecording}
                  variant="editorial"
                  className="text-red-700 hover:text-red-800 border-red-200 hover:bg-red-50"
                >
                  <Trash2 size={14} />
                  <span>Annuler l'enregistrement</span>
                </Button>
              </div>
            </div>
          ) : (
            /* Mode Prêt à enregistrer */
            <div className="space-y-8 animate-fade-in flex flex-col items-center">
              <div className="relative group cursor-pointer">
                {/* Anneaux de pulsation soft en arrière-plan */}
                <span className="absolute -inset-4 rounded-full bg-primary/5 group-hover:bg-primary/10 transition-all duration-300 animate-pulse" />
                <span className="absolute -inset-8 rounded-full bg-primary/2 group-hover:bg-primary/5 transition-all duration-500 animate-pulse delay-75" />

                {/* Grand bouton micro central (agrandi de 1.5x) */}
                <button
                  onClick={notesApi.startRecording}
                  title="Enregistrer ma voix"
                  className="w-48 h-48 rounded-full bg-primary hover:bg-primary-active text-white flex items-center justify-center shadow-elevated transition-all duration-300 hover:scale-105 active:scale-95 relative z-10"
                >
                  <Mic size={72} className="transition-transform group-hover:scale-110" />
                </button>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-ink-secondary">Enregistrez vos idées</h3>
                <p className="text-sm text-ink-faint font-sans leading-relaxed max-w-sm">
                  Parlez naturellement. L'IA se charge de retranscrire, résumer et structurer votre note vocale.
                </p>
              </div>

              <div className="flex items-center gap-4 pt-4 w-full">
                <Button
                  href="/notes"
                  variant="editorial"
                  className="flex-1"
                >
                  <FileText size={14} className="text-ink-muted" />
                  <span>Mes notes</span>
                </Button>
                <Button
                  href="/ask"
                  variant="editorial"
                  className="flex-1"
                >
                  <MessageSquare size={14} className="text-ink-muted" />
                  <span>Poser une question</span>
                </Button>
              </div>
            </div>
          )}

        </div>
      </main>

    </div>
  );
}
