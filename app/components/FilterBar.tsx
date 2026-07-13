"use client";

import React from "react";
import { Note } from "../hooks/useNotes";

export const AVAILABLE_TAGS = [
  { value: "boulot", label: "Boulot", emoji: "💼", bgClass: "bg-sky-50 border-sky-100 text-sky-800" },
  { value: "administration", label: "Admin", emoji: "📝", bgClass: "bg-purple-50 border-purple-100 text-purple-800" },
  { value: "sante", label: "Santé", emoji: "❤️", bgClass: "bg-emerald-50 border-emerald-100 text-emerald-800" },
  { value: "finance", label: "Finance", emoji: "💶", bgClass: "bg-amber-50 border-amber-100 text-amber-800" },
  { value: "loisir", label: "Loisir", emoji: "🎉", bgClass: "bg-pink-50 border-pink-100 text-pink-800" },
  { value: "autre", label: "Autre", emoji: "🏷️", bgClass: "bg-neutral-100 border-neutral-200 text-neutral-600" }
];

interface FilterBarProps {
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
  notes: Note[];
}

export default function FilterBar({
  selectedTag,
  setSelectedTag,
  notes,
}: FilterBarProps) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-none pb-2 shrink-0 w-full">
      <button
        onClick={() => setSelectedTag(null)}
        className={`px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap shadow-soft active:scale-95 ${
          selectedTag === null
            ? "bg-primary border-primary text-white"
            : "bg-canvas border-hairline text-ink-secondary hover:bg-canvas-soft"
        }`}
      >
        Tous ({notes.length})
      </button>
      {AVAILABLE_TAGS.map((tag) => {
        const count = notes.filter((n) => n.tags?.includes(tag.value)).length;
        return (
          <button
            key={tag.value}
            onClick={() => setSelectedTag(selectedTag === tag.value ? null : tag.value)}
            className={`px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap shadow-soft active:scale-95 flex items-center gap-1.5 ${
              selectedTag === tag.value
                ? "bg-primary border-primary text-white"
                : "bg-canvas border-hairline text-ink-secondary hover:bg-canvas-soft"
            }`}
          >
            <span>{tag.emoji}</span>
            <span>{tag.label}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              selectedTag === tag.value
                ? "bg-white/20 text-white"
                : "bg-canvas-soft text-ink-faint"
            }`}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
