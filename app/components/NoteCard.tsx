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
      {/* Entête de la Note Card */}
      <div className="px-6 py-4 bg-canvas-soft/20 border-b border-hairline flex flex-col gap-2 relative shrink-0">
        
        {/* Ligne 1 : Titre et indicateur de couleur */}
        <div className="flex justify-between items-center w-full pr-8">
          <div className="flex items-center gap-2.5">
            <span className={`w-3 h-3 rounded-full inline-block shrink-0 ${
              new Date(note.createdAt).getDate() % 2 === 0 ? "bg-sticker-purple" : "bg-sticker-sky"
            }`} />
            <h4 className="text-sm md:text-base font-bold text-ink-secondary font-sans tracking-heading-3">
              Note du {dateString}
            </h4>
          </div>
        </div>

        {/* Bouton Menu Actions positionné absolument en haut à droite */}
        <div className="absolute right-4 top-4.5">
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

        {/* Ligne 2 : Badges de thématiques en dessous du titre */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pl-5.5 mt-0.5">
            {note.tags.map((t: string) => {
              const tagInfo = AVAILABLE_TAGS.find((tag) => tag.value === t);
              if (!tagInfo) return null;
              return (
                <span
                  key={t}
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${tagInfo.bgClass} shadow-soft`}
                >
                  <span>{tagInfo.emoji}</span>
                  <span>{tagInfo.label}</span>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Entête avec onglets épurés (Style Notion Tabs, scrollable sur mobile) */}
      <div className="flex border-b border-hairline bg-canvas-soft/10 px-4 pt-2 gap-2 md:gap-4 overflow-x-auto scrollbar-none shrink-0">
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
      <div className="p-6 md:p-8">
        
        {activeTab === "summary" && (
          <div className="space-y-5">
            <div className="flex justify-between items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sticker-orange inline-block shrink-0" />
                <h5 className="text-xs uppercase tracking-eyebrow font-bold text-ink-muted">Synthèse</h5>
              </div>
              <button
                onClick={() => copyToClipboard(note.summary, `sum-${note._id}`)}
                className="px-3 py-1.5 bg-canvas hover:bg-canvas-soft border border-hairline text-ink-secondary rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-soft active:scale-95 shrink-0"
              >
                {copiedText === `sum-${note._id}` ? <Check size={12} className="text-sticker-green" /> : <Copy size={12} />}
                <span>{copiedText === `sum-${note._id}` ? "Copié" : "Copier"}</span>
              </button>
            </div>
            <p className="text-ink-secondary text-base leading-relaxed whitespace-pre-wrap font-sans">
              {note.summary}
            </p>
          </div>
        )}

        {activeTab === "todo" && (
          <div className="space-y-5">
            <div className="flex justify-between items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sticker-green inline-block shrink-0" />
                <h5 className="text-xs uppercase tracking-eyebrow font-bold text-ink-muted">Plan d'action</h5>
              </div>
              <button
                onClick={() => {
                  const copyText = note.todoList
                    .map((item) => `${item.done ? "✓" : "☐"} ${item.text}`)
                    .join("\n");
                  copyToClipboard(copyText, `todo-${note._id}`);
                }}
                className="px-3 py-1.5 bg-canvas hover:bg-canvas-soft border border-hairline text-ink-secondary rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-soft active:scale-95 shrink-0"
              >
                {copiedText === `todo-${note._id}` ? <Check size={12} className="text-sticker-green" /> : <Copy size={12} />}
                <span>{copiedText === `todo-${note._id}` ? "Copié" : "Copier"}</span>
              </button>
            </div>
            
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
    </div>
  );
}
