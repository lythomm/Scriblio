"use client";

import React from "react";
import { useNotes } from "./hooks/useNotes";
import Sidebar from "./components/Sidebar";
import FilterBar from "./components/FilterBar";
import NoteCard from "./components/NoteCard";
import RecorderBar from "./components/RecorderBar";
import ConfirmDialog from "./components/ConfirmDialog";
import ToastContainer from "./components/ToastContainer";
import Link from "next/link";
import { Menu, FileText } from "lucide-react";

export default function Home() {
  const notesApi = useNotes();

  return (
    <div className="flex h-screen overflow-hidden bg-canvas-soft font-sans antialiased text-ink">
      
      {/* Conteneur des Toasts de notifications */}
      <ToastContainer toasts={notesApi.toasts} />

      {/* Barre latérale : Index des notes */}
      <Sidebar
        notes={notesApi.filteredNotes}
        isSidebarOpen={notesApi.isSidebarOpen}
        setIsSidebarOpen={notesApi.setIsSidebarOpen}
        scrollToNote={notesApi.scrollToNote}
        selectedTag={notesApi.selectedTag}
      />

      {/* Zone Centrale Principale */}
      <main className="flex-1 flex flex-col h-full bg-canvas-soft overflow-y-auto relative">
        
        {/* En-tête minimaliste avec bouton Hamburger pour mobile */}
        <header className="px-4 md:px-8 py-4 border-b border-hairline bg-canvas flex justify-between items-center shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            {/* Hamburger menu visible uniquement sur mobile */}
            <button
              onClick={() => notesApi.setIsSidebarOpen(true)}
              className="p-1 md:hidden text-ink-muted hover:text-ink cursor-pointer"
            >
              <Menu size={22} />
            </button>
            
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-sticker-sky inline-block" />
              <h2 className="text-sm font-semibold uppercase tracking-eyebrow text-ink-muted">
                Flux de Notes Vocales
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/ask"
              className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-soft active:scale-95 shrink-0"
            >
              <span>💬 Poser une question</span>
            </Link>
            <span className="text-xs text-ink-faint hidden sm:inline">
              Total : {notesApi.filteredNotes.length} notes
            </span>
          </div>
        </header>

        {/* Zone de Contenu */}
        <div className="flex-1 p-4 md:p-8 flex flex-col gap-6 max-w-3xl mx-auto w-full pb-28">
          
          {/* Barre de filtres thématiques (Notion Pills) */}
          <FilterBar
            selectedTag={notesApi.selectedTag}
            setSelectedTag={notesApi.setSelectedTag}
            notes={notesApi.notes}
          />

          {/* Flux de notes empilées */}
          {notesApi.filteredNotes.length === 0 ? (
            <div className="bg-canvas border border-hairline border-dashed rounded-lg p-14 text-center text-ink-muted text-base shadow-soft mt-4">
              <FileText size={28} className="text-ink-faint mx-auto mb-3" />
              <p className="font-semibold text-ink-secondary">Aucun contenu disponible</p>
              <p className="text-sm text-ink-faint mt-1.5 font-sans">
                {notesApi.selectedTag ? "Aucune note ne correspond à cette thématique." : "Enregistrez un message vocal pour commencer."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {notesApi.filteredNotes.map((note) => {
                const activeTab = notesApi.getNoteActiveTab(note._id);
                return (
                  <NoteCard
                    key={note._id}
                    note={note}
                    activeTab={activeTab}
                    setNoteActiveTab={notesApi.setNoteActiveTab}
                    openMenuNoteId={notesApi.openMenuNoteId}
                    setOpenMenuNoteId={notesApi.setOpenMenuNoteId}
                    setNoteToDelete={notesApi.setNoteToDelete}
                    startModifyingNote={notesApi.startModifyingNote}
                    handleToggleTodo={notesApi.handleToggleTodo}
                    copyToClipboard={notesApi.copyToClipboard}
                    copiedText={notesApi.copiedText}
                  />
                );
              })}
            </div>
          )}

        </div>
      </main>

      {/* Barre d'enregistrement fixe au bas */}
      <RecorderBar
        isRecording={notesApi.isRecording}
        recordingDuration={notesApi.recordingDuration}
        isProcessing={notesApi.isProcessing}
        processingStep={notesApi.processingStep}
        modifyingNote={notesApi.modifyingNote}
        startRecording={notesApi.startRecording}
        stopRecording={notesApi.stopRecording}
        cancelModifyingNote={notesApi.cancelModifyingNote}
        cancelRecording={notesApi.cancelRecording}
      />

      {/* Dialogue Modal de Confirmation de Suppression */}
      <ConfirmDialog
        isOpen={!!notesApi.noteToDelete}
        onClose={() => notesApi.setNoteToDelete(null)}
        onConfirm={() => notesApi.noteToDelete && notesApi.handleDeleteNote(notesApi.noteToDelete)}
        title="Confirmer la suppression"
        message="Êtes-vous sûr de vouloir supprimer cette note ? Cette action est irréversible."
      />

    </div>
  );
}
