"use client";

import React from "react";
import { MoreVertical, Calendar, Copy, Check } from "lucide-react";
import { Note } from "../hooks/useNotes";
import { AVAILABLE_TAGS } from "./FilterBar";

interface NoteCardProps {
  note: Note;
  activeTab: "summary" | "todo";
  setNoteActiveTab: (noteId: string, tab: "summary" | "todo") => void;
  openMenuNoteId: string | null;
  setOpenMenuNoteId: (noteId: string | null) => void;
  setNoteToDelete: (noteId: string) => void;
  startModifyingNote: (noteId: string, summary: string, dateStr: string) => void;
  handleToggleTodo: (noteId: string, index: number) => void;
  copyToClipboard: (text: string, type: string) => void;
  copiedText: string | null;
}

export default function NoteCard({
  note,
  activeTab,
  setNoteActiveTab,
  openMenuNoteId,
  setOpenMenuNoteId,
  setNoteToDelete,
  startModifyingNote,
  handleToggleTodo,
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

      {/* Entête avec onglets épurés (Style Notion Tabs, scrollable sur mobile) */}
      <div className="flex border-b border-hairline bg-canvas-soft/10 px-4 pt-2 gap-2 md:gap-4 overflow-x-auto scrollbar-none shrink-0 pr-12 relative">
        <button
          onClick={() => setNoteActiveTab(note._id, "summary")}
          className={`py-2.5 px-3 text-sm font-semibold transition-all duration-150 border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === "summary"
              ? "border-primary text-primary"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          Résumé
        </button>
        <button
          onClick={() => setNoteActiveTab(note._id, "todo")}
          className={`py-2.5 px-3 text-sm font-semibold transition-all duration-150 border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === "todo"
              ? "border-primary text-primary"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          Plan d'Action / To-Do
        </button>
      </div>

      {/* Contenu de l'onglet actif pour cette note spécifique */}
      <div className="p-6 md:p-8 flex-1">
        
        {activeTab === "summary" && (
          <div 
            onClick={() => copyToClipboard(note.summary, `sum-${note._id}`)}
            title="Cliquez pour copier la synthèse"
            className="cursor-pointer group relative active:opacity-75 select-text"
          >
            <p className="text-ink-secondary text-base leading-relaxed whitespace-pre-wrap font-sans transition-colors group-hover:text-ink">
              {note.summary}
            </p>
            {copiedText === `sum-${note._id}` && (
              <span className="absolute -top-6 right-0 px-2 py-0.5 bg-sky-50 border border-sky-100 text-[10px] text-sky-800 rounded font-semibold animate-fade-in-down">
                Copié !
              </span>
            )}
          </div>
        )}

        {activeTab === "todo" && (
          <div>
            {note.todoList.length === 0 ? (
              <p className="text-ink-muted text-base italic">Aucune action concrète identifiée.</p>
            ) : (
              <ul className="space-y-3.5">
                {note.todoList.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3.5 text-base text-ink-secondary group">
                    <div
                      onClick={() => handleToggleTodo(note._id, idx)}
                      className="flex items-start gap-3.5 cursor-pointer w-full"
                    >
                      <div
                        className="mt-1.5 w-4.5 h-4.5 rounded-sm border border-neutral-300 group-hover:border-primary flex items-center justify-center shrink-0 transition-colors bg-canvas active:scale-95"
                      >
                        {item.done ? (
                          <Check size={10} className="text-primary font-bold animate-fade-in-down" />
                        ) : (
                          <span className="w-1.5 h-1.5 bg-transparent rounded-sm group-hover:bg-primary/20" />
                        )}
                      </div>
                      <span className={`leading-normal text-base transition-colors duration-155 select-none ${
                        item.done ? "text-ink-faint line-through decoration-neutral-300" : "text-neutral-700 hover:text-ink"
                      }`}>
                        {item.text}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

      </div>

      {/* Footer de la Note Card (Date et Tags) */}
      <div className="px-6 py-3 border-t border-hairline bg-canvas-soft/10 flex items-center justify-between flex-wrap gap-2 text-xs text-ink-faint shrink-0 select-none">
        <div className="flex items-center gap-1.5">
          <Calendar size={12} className="text-ink-muted" />
          <span>{dateString}</span>
        </div>
        
        {/* Badges de thématiques */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
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
      </div>
    </div>
  );
}
