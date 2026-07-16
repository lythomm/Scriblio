"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Sidebar from "../components/Sidebar";
import ToastContainer from "../components/ToastContainer";
import { Toast } from "../hooks/useNotes";
import WhiteboardCanvas from "../components/WhiteboardCanvas";
import { useGeminiLive } from "../hooks/useGeminiLive";
import {
  Menu,
  Mic,
  MicOff,
  Plus,
  Trash2,
  ChevronLeft,
  Loader2,
  FolderOpen,
} from "lucide-react";
import Button from "../components/Button";

export default function WhiteboardPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeMindMapId, setActiveMindMapId] = useState<Id<"mindMaps"> | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Requêtes Convex
  const mindMaps = useQuery(api.mindmaps.getMindMaps) || [];
  const activeNodes = useQuery(
    api.mindmaps.getNodes,
    activeMindMapId ? { mindMapId: activeMindMapId } : "skip"
  ) || [];

  // Mutations Convex
  const createMindMap = useMutation(api.mindmaps.createMindMap);
  const deleteMindMap = useMutation(api.mindmaps.deleteMindMap);
  const deleteNode = useMutation(api.mindmaps.deleteNode);

  // Fonction Toast
  const showToast = (message: string, type: "success" | "error" | "warning") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Liaison avec le hook Gemini Live pour la transcription/modification en direct
  const {
    isRecording,
    recordingDuration,
    isConnecting,
    startSession,
    stopSession,
  } = useGeminiLive({
    mindMapId: activeMindMapId!,
    onShowToast: showToast,
  });

  const activeMindMap = mindMaps.find((m) => m._id === activeMindMapId);

  // Formatter la durée de l'enregistrement
  const formatDuration = (secs: number) => {
    const min = Math.floor(secs / 60).toString().padStart(2, "0");
    const sec = (secs % 60).toString().padStart(2, "0");
    return `${min}:${sec}`;
  };

  // Créer une mind map
  const handleCreateMindMap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      setIsCreating(true);
      const newId = await createMindMap({ title: newTitle.trim() });
      setActiveMindMapId(newId);
      setNewTitle("");
      showToast("Nouvelle carte heuristique créée !", "success");
    } catch (err: any) {
      console.error(err);
      showToast("Erreur lors de la création.", "error");
    } finally {
      setIsCreating(false);
    }
  };

  // Supprimer une mind map
  const handleDeleteMindMap = async (id: Id<"mindMaps">, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Voulez-vous vraiment supprimer cette carte et tous ses nœuds ?")) return;

    try {
      await deleteMindMap({ id });
      if (activeMindMapId === id) {
        setActiveMindMapId(null);
        stopSession();
      }
      showToast("Carte supprimée avec succès.", "success");
    } catch (err) {
      showToast("Erreur lors de la suppression.", "error");
    }
  };

  // Supprimer un nœud
  const handleDeleteNode = async (nodeId: string) => {
    try {
      await deleteNode({ id: nodeId as Id<"nodes"> });
    } catch (err) {
      showToast("Erreur lors de la suppression du nœud.", "error");
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-canvas-soft font-sans antialiased text-ink">
      <ToastContainer toasts={toasts} />

      {/* Barre latérale globale */}
      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

      <main className="flex-1 flex flex-col h-full bg-canvas-soft overflow-hidden relative">
        
        {/* MODE LISTE : Choix de la Mind Map */}
        {!activeMindMapId ? (
          <div className="flex-1 flex flex-col h-full overflow-y-auto">
            {/* Header minimaliste */}
            <header className="px-6 py-4 border-b border-hairline bg-white flex items-center justify-between shrink-0 sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-1 md:hidden text-ink-muted hover:text-ink cursor-pointer"
                >
                  <Menu size={22} />
                </button>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-sticker-purple inline-block" />
                  <h2 className="text-sm font-semibold uppercase tracking-eyebrow text-ink-muted">
                    Tableaux Blancs Vocaux
                  </h2>
                </div>
              </div>
            </header>

            {/* Corps principal : Grille de mind maps */}
            <div className="max-w-5xl w-full mx-auto p-6 md:p-8 flex-1 space-y-8">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-ink font-sans">
                  Vos Cartes Heuristiques
                </h1>
                <p className="text-sm text-ink-secondary leading-relaxed">
                  Créez des schémas d'idées structurés instantanément en parlant de façon naturelle.
                </p>
              </div>

              {/* Formulaire de création rapide */}
              <form onSubmit={handleCreateMindMap} className="flex gap-3 max-w-lg bg-white p-4 border border-hairline rounded-lg shadow-soft">
                <input
                  type="text"
                  placeholder="Nom du nouveau tableau..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  disabled={isCreating}
                  className="flex-1 px-3 py-2 border border-hairline rounded-md text-sm text-ink bg-white focus:outline-none focus:border-primary focus:shadow-soft"
                />
                <Button type="submit" disabled={isCreating || !newTitle.trim()} variant="primary">
                  {isCreating ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Plus size={16} />
                  )}
                  <span>Créer</span>
                </Button>
              </form>

              {/* Grille des cartes existantes */}
              {mindMaps.length === 0 ? (
                <div className="border border-dashed border-hairline rounded-lg p-12 text-center bg-white space-y-4">
                  <div className="w-12 h-12 rounded-full bg-sticker-purple/10 flex items-center justify-center text-sticker-purple mx-auto">
                    <FolderOpen size={24} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-ink">Aucun tableau blanc</h3>
                    <p className="text-sm text-ink-faint">
                      Entrez un nom ci-dessus pour lancer votre première session.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mindMaps.map((map) => (
                    <div
                      key={map._id}
                      onClick={() => setActiveMindMapId(map._id)}
                      className="p-5 bg-white border border-hairline rounded-lg hover:border-primary transition-all duration-200 cursor-pointer shadow-soft group flex flex-col justify-between h-32"
                    >
                      <h3 className="font-bold text-ink text-base group-hover:text-primary transition-colors line-clamp-1">
                        {map.title}
                      </h3>
                      <div className="flex justify-between items-center text-xs text-ink-faint">
                        <span>Créé le {new Date(map.createdAt).toLocaleDateString("fr-FR")}</span>
                        <button
                          onClick={(e) => handleDeleteMindMap(map._id, e)}
                          className="p-1.5 hover:bg-red-50 hover:text-red-650 rounded-md text-ink-muted transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                          title="Supprimer la carte"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* MODE DESSIN : Canvas interactif */
          <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            {/* Header du tableau blanc */}
            <header className="px-4 md:px-6 py-3 border-b border-hairline bg-white flex items-center justify-between shrink-0 z-20 shadow-soft">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    stopSession();
                    setActiveMindMapId(null);
                  }}
                  className="p-1.5 hover:bg-neutral-50 border border-hairline rounded-md text-ink-muted hover:text-ink cursor-pointer"
                  title="Retour aux cartes"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Tableau Actif</span>
                  <h1 className="font-bold text-base text-ink leading-tight line-clamp-1">
                    {activeMindMap?.title}
                  </h1>
                </div>
              </div>

              {/* Contrôles d'écoute vocale IA */}
              <div className="flex items-center gap-3 bg-neutral-50 px-3 py-1.5 border border-hairline rounded-full">
                {isRecording ? (
                  // Mode enregistrement actif
                  <div className="flex items-center gap-3">
                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                    <span className="text-xs font-mono font-bold text-ink tabular-nums">
                      {formatDuration(recordingDuration)}
                    </span>
                    <button
                      onClick={stopSession}
                      className="flex items-center gap-1.5 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-bold transition-colors cursor-pointer"
                    >
                      <MicOff size={12} />
                      <span>Arrêter</span>
                    </button>
                  </div>
                ) : isConnecting ? (
                  // Mode connexion en cours
                  <div className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-primary" />
                    <span className="text-xs font-semibold text-ink-muted">Connexion...</span>
                  </div>
                ) : (
                  // Mode prêt à écouter
                  <button
                    onClick={startSession}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-primary hover:bg-primary-active text-white rounded-full text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95"
                  >
                    <Mic size={14} />
                    <span>Lancer la voix IA</span>
                  </button>
                )}
              </div>
            </header>

            {/* Zone centrale du Canvas */}
            <div className="flex-1 relative overflow-hidden">
              <WhiteboardCanvas
                dbNodes={activeNodes}
                onDeleteNode={handleDeleteNode}
                isListening={isRecording}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
