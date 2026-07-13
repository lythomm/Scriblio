"use client";

import React from "react";
import { Mic, Calendar, X } from "lucide-react";
import { Note } from "../hooks/useNotes";

interface SidebarProps {
  notes: Note[];
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  scrollToNote: (id: string) => void;
  selectedTag: string | null;
}

export default function Sidebar({
  notes,
  isSidebarOpen,
  setIsSidebarOpen,
  scrollToNote,
  selectedTag,
}: SidebarProps) {
  return (
    <>
      {/* Overlay Backdrop pour la barre latérale sur mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-neutral-900/40 z-40 md:hidden transition-opacity duration-200"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Barre latérale : Index/Raccourcis de l'historique */}
      <aside className={`fixed inset-y-0 left-0 z-45 w-72 bg-canvas border-r border-hairline bg-canvas flex flex-col shrink-0 transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        
        {/* Titre / Identité de l'application */}
        <div className="p-5 border-b border-hairline flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-sticker-purple flex items-center justify-center text-xs font-bold text-sticker-purple-deep shadow-soft">
              S
            </span>
            <h1 className="text-base font-bold tracking-title text-ink font-sans">
              Scriblio
            </h1>
          </div>
          <button 
            className="md:hidden p-1.5 text-ink-muted hover:text-ink cursor-pointer"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Index des notes */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="flex items-center justify-between px-2 py-1.5 text-xs font-semibold text-ink-faint uppercase tracking-wider">
            <span>Index des Notes</span>
            <span className="text-xs bg-canvas-soft px-1.5 py-0.5 rounded-sm border border-hairline font-normal text-ink-muted">
              {notes.length}
            </span>
          </div>
          
          {notes.length === 0 ? (
            <div className="text-center py-8 px-4 text-ink-faint text-sm italic">
              {selectedTag ? "Aucune note pour ce filtre." : "Aucune note vocale."}
            </div>
          ) : (
            notes.map((note) => (
              <button
                key={note._id}
                onClick={() => scrollToNote(note._id)}
                className="w-full text-left px-3 py-2.5 rounded-md transition-all duration-150 block text-sm hover:bg-canvas-soft/60 text-ink-secondary cursor-pointer"
              >
                <div className="line-clamp-1 font-medium text-ink-secondary text-sm">
                  {note.summary || "Note sans résumé"}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-ink-faint mt-1.5">
                  <Calendar size={12} />
                  <span>
                    {new Date(note.createdAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
        
        {/* Footer Sidebar */}
        <div className="p-4 border-t border-hairline bg-canvas-soft/40 flex justify-between items-center text-xs text-ink-faint">
          <span className="flex items-center gap-1"><Mic size={12} /> Scriblio</span>
          <span>Google Gen AI SDK v2</span>
        </div>
      </aside>
    </>
  );
}
