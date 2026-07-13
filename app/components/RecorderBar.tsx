"use client";

import React from "react";
import { Mic, Square, Loader2, Sparkles } from "lucide-react";

interface RecorderBarProps {
  isRecording: boolean;
  recordingDuration: number;
  isProcessing: boolean;
  processingStep: string;
  modifyingNote: { id: string; summary: string; dateStr: string } | null;
  startRecording: () => void;
  stopRecording: () => void;
  cancelModifyingNote: () => void;
}

export default function RecorderBar({
  isRecording,
  recordingDuration,
  isProcessing,
  processingStep,
  modifyingNote,
  startRecording,
  stopRecording,
  cancelModifyingNote,
}: RecorderBarProps) {
  // Formatage du timer d'enregistrement
  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed bottom-0 left-0 md:left-72 right-0 p-4 bg-gradient-to-t from-canvas-soft via-canvas-soft/95 to-transparent z-30 flex flex-col items-center gap-2">

      {/* Bandeau de Modification Contextuelle */}
      {modifyingNote && (
        <div className="w-full max-w-md px-4 py-2.5 bg-amber-50/95 backdrop-blur-sm border border-amber-200 rounded-lg flex items-center justify-between text-xs font-semibold text-amber-800 shadow-soft animate-fade-in-down mb-1 select-none">
          <span className="flex items-center gap-1.5">
            <Sparkles size={12} className="text-amber-600 shrink-0" />
            <span>Modification de la note du {modifyingNote.dateStr}</span>
          </span>
          <button
            onClick={cancelModifyingNote}
            className="px-2 py-1 bg-white hover:bg-amber-100/50 border border-amber-200 rounded text-amber-900 cursor-pointer transition-colors"
          >
            Annuler
          </button>
        </div>
      )}

      {isProcessing ? (
        <div className="w-full max-w-md px-6 py-3 rounded-full bg-canvas border border-hairline text-ink flex items-center justify-center gap-3 shadow-elevated">
          <Loader2 className="animate-spin text-primary" size={16} />
          <span className="text-sm font-semibold">{processingStep || "Traitement..."}</span>
        </div>
      ) : isRecording ? (
        <button
          onClick={stopRecording}
          className="w-full max-w-md px-8 py-3.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold text-sm flex items-center justify-center gap-2.5 shadow-elevated cursor-pointer"
        >
          <Square size={14} fill="white" />
          <span>Arrêter ({formatTime(recordingDuration)})</span>
          {/* Onde audio animée compacte */}
          <div className="flex items-center gap-0.5 h-3 ml-2">
            <span className="w-0.5 h-3 rounded-full bg-white/80 animate-wave-1" />
            <span className="w-0.5 h-3 rounded-full bg-white/80 animate-wave-2" />
            <span className="w-0.5 h-3 rounded-full bg-white/80 animate-wave-3" />
          </div>
        </button>
      ) : (
        <button
          onClick={startRecording}
          className="w-full max-w-md px-8 py-3.5 rounded-full bg-primary hover:bg-primary-active text-white font-semibold text-sm flex items-center justify-center gap-2.5 shadow-elevated hover:scale-[1.01] active:scale-[0.99] transition-all duration-150 cursor-pointer"
        >
          <Mic size={14} />
          <span>Enregistrer ma voix</span>
        </button>
      )}
    </div>
  );
}
