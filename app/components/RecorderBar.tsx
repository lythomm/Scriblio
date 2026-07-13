"use client";

import React from "react";
import { Mic, Square, Loader2, Sparkles, Trash2 } from "lucide-react";

interface RecorderBarProps {
  isRecording: boolean;
  recordingDuration: number;
  isProcessing: boolean;
  processingStep: string;
  modifyingNote: { id: string; summary: string; dateStr: string } | null;
  startRecording: () => void;
  stopRecording: () => void;
  cancelModifyingNote: () => void;
  cancelRecording: () => void;
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
  cancelRecording,
}: RecorderBarProps) {
  // Formatage du timer d'enregistrement
  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className={
      isRecording || isProcessing
        ? "fixed bottom-0 left-0 md:left-72 right-0 p-4 bg-gradient-to-t from-canvas-soft via-canvas-soft/95 to-transparent z-30 flex flex-col items-center gap-2 animate-fade-in"
        : "fixed bottom-6 right-6 z-30 flex flex-col items-end gap-2"
    }>

      {isProcessing ? (
        <div className="w-full max-w-md px-6 py-3 rounded-full bg-canvas border border-hairline text-ink flex items-center justify-center gap-3 shadow-elevated">
          <Loader2 className="animate-spin text-primary" size={16} />
          <span className="text-sm font-semibold">{processingStep || "Traitement..."}</span>
        </div>
      ) : isRecording ? (
        <div className="flex items-center gap-3 w-full max-w-md">
          <button
            onClick={stopRecording}
            className="flex-1 px-8 py-3.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold text-sm flex items-center justify-center gap-2.5 shadow-elevated cursor-pointer"
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

          <button
            onClick={cancelRecording}
            title="Annuler l'enregistrement"
            className="w-12 h-12 rounded-full bg-canvas border border-hairline text-ink-muted hover:text-red-600 hover:bg-red-50 hover:border-red-100 transition-all duration-150 cursor-pointer shadow-soft flex items-center justify-center shrink-0 hover:scale-105 active:scale-95"
          >
            <Trash2 size={18} />
          </button>
        </div>
      ) : (
        <button
          onClick={startRecording}
          title="Enregistrer ma voix"
          className="w-16 h-16 rounded-full bg-primary hover:bg-primary-active text-white flex items-center justify-center shadow-elevated hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer"
        >
          <Mic size={26} />
        </button>
      )}
    </div>
  );
}
