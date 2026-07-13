"use client";

import { MoreVertical, Calendar, Copy } from "lucide-react";
import { Note } from "../hooks/useNotes";
import { AVAILABLE_TAGS } from "./FilterBar";

interface NoteCardProps {
  note: Note;
  openMenuNoteId: string | null;
  setOpenMenuNoteId: (noteId: string | null) => void;
  setNoteToDelete: (noteId: string) => void;
  startModifyingNote: (noteId: string, summary: string, dateStr: string) => void;
  copyToClipboard: (text: string, type: string) => void;
  copiedText: string | null;
}

export default function NoteCard({
  note,
  openMenuNoteId,
  setOpenMenuNoteId,
  setNoteToDelete,
  startModifyingNote,
  copyToClipboard,
  copiedText,
}: NoteCardProps) {
  const dateString = new Date(note.createdAt).toLocaleString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  const formattedDateShort = new Date(note.createdAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });

  return (
    <div 
      id={`note-${note._id}`}
      className="bg-canvas border border-hairline rounded-lg shadow-soft overflow-hidden flex flex-col scroll-mt-20 relative animate-fade-in-down"
    >
      {/* Bouton Menu Actions positionné absolument en haut à droite */}
      <div className="absolute right-4 top-3.5 z-20">
        <button
          onClick={() => setOpenMenuNoteId(openMenuNoteId === note._id ? null : note._id)}
          className="p-1.5 rounded hover:bg-canvas-soft text-ink-muted hover:text-ink cursor-pointer transition-colors"
        >
          <MoreVertical size={16} />
        </button>
        
        {openMenuNoteId === note._id && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setOpenMenuNoteId(null)}
            />
            <div className="absolute right-0 mt-1.5 w-32 bg-canvas border border-hairline rounded-md shadow-lg z-50 py-1 text-sm text-ink-secondary animate-fade-in-down">
              <button
                onClick={() => {
                  setOpenMenuNoteId(null);
                  startModifyingNote(note._id, note.summary, formattedDateShort);
                }}
                className="w-full text-left px-3 py-2 hover:bg-canvas-soft text-ink-secondary flex items-center gap-2 cursor-pointer transition-colors"
              >
                Modifier
              </button>
              <button
                onClick={() => {
                  setOpenMenuNoteId(null);
                  setNoteToDelete(note._id);
                }}
                className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 cursor-pointer font-semibold transition-colors animate-fade-in-down"
              >
                Supprimer
              </button>
            </div>
          </>
        )}
      </div>

      {/* Badges de thématiques en haut */}
      {note.tags && note.tags.length > 0 && (
        <div className="flex border-b border-hairline bg-canvas-soft/10 px-6 py-3.5 gap-1.5 flex-wrap shrink-0 pr-12 select-none">
          {note.tags.map((t: string) => {
            const tagInfo = AVAILABLE_TAGS.find((tag) => tag.value === t);
            if (!tagInfo) return null;
            return (
              <span
                key={t}
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${tagInfo.bgClass} shadow-soft`}
              >
                <span>{tagInfo.emoji}</span>
                <span>{tagInfo.label}</span>
              </span>
            );
          })}
        </div>
      )}

      {/* Contenu de la note spécifique (sans onglet) */}
      <div className="p-6 md:p-8 flex-1">
        <div 
          onClick={() => copyToClipboard(note.summary, `sum-${note._id}`)}
          title="Cliquez pour copier la synthèse"
          className="cursor-pointer group relative active:opacity-75 select-text"
        >
          <p className="text-ink-secondary text-base leading-relaxed whitespace-pre-wrap font-editorial transition-colors group-hover:text-ink">
            {note.summary}
          </p>
          {copiedText === `sum-${note._id}` && (
            <span className="absolute -top-6 right-0 px-2 py-0.5 bg-sky-50 border border-sky-100 text-[10px] text-sky-800 rounded font-semibold animate-fade-in-down">
              Copié !
            </span>
          )}
        </div>
      </div>

      {/* Footer de la Note Card (Uniquement Date) */}
      <div className="px-6 py-3 border-t border-hairline bg-canvas-soft/10 flex items-center justify-between flex-wrap gap-2 text-xs text-ink-faint shrink-0 select-none">
        <div className="flex items-center gap-1.5">
          <Calendar size={12} className="text-ink-muted" />
          <span>{dateString}</span>
        </div>
      </div>
    </div>
  );
}
