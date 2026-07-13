"use client";

import React from "react";
import { useNotes } from "../hooks/useNotes";
import Sidebar from "../components/Sidebar";
import FilterBar from "../components/FilterBar";
import NoteCard from "../components/NoteCard";
import RecorderBar from "../components/RecorderBar";
import ConfirmDialog from "../components/ConfirmDialog";
import ToastContainer from "../components/ToastContainer";
import { Menu, FileText } from "lucide-react";

export default function HistoryPage() {
  const notesApi = useNotes();

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
              <span className="w-3 h-3 rounded-full bg-sticker-purple inline-block" />
              <h2 className="text-sm font-semibold uppercase tracking-eyebrow text-ink-muted">
                Mes notes
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-ink-faint">
              Total : {notesApi.filteredNotes.length} notes
            </span>
          </div>
        </header>

        {/* Zone de Contenu */}
        <div className="flex-1 p-4 md:p-8 flex flex-col gap-6 max-w-3xl mx-auto w-full pb-20">
          
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
              <h3 className="text-base font-bold text-ink-secondary">Aucune note enregistrée</h3>
              <p className="text-sm text-ink-faint mt-1.5 font-sans">
                {notesApi.selectedTag ? "Aucune note ne correspond à cette thématique." : "Allez sur le tableau de bord pour enregistrer une note vocale."}
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

      {/* Dialogue Modal de Confirmation de Suppression */}
      <ConfirmDialog
        isOpen={!!notesApi.noteToDelete}
        onClose={() => notesApi.setNoteToDelete(null)}
        onConfirm={() => notesApi.noteToDelete && notesApi.handleDeleteNote(notesApi.noteToDelete)}
        title="Confirmer la suppression"
        message="Êtes-vous sûr de vouloir supprimer cette note ? Cette action est irréversible."
      />

      {/* Barre d'enregistrement flottante (visible uniquement pendant la modification d'une note) */}
      {(notesApi.isRecording || notesApi.isProcessing) && (
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
      )}

    </div>
  );
}
