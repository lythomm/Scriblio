"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "warning";
}

export interface Note {
  _id: string;
  _creationTime: number;
  userId: string;
  summary: string;
  todoList: { text: string; done: boolean }[];
  tags?: string[];
  audioStorageId?: string;
  createdAt: number;
}

export function useNotes() {
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    let storedId = localStorage.getItem("scriblio_user_id");
    if (!storedId) {
      storedId = "user_" + Math.random().toString(36).substring(2, 11);
      localStorage.setItem("scriblio_user_id", storedId);
    }
    setUserId(storedId);
  }, []);

  // Récupération de l'historique en temps réel via Convex Query
  const notes = useQuery(api.notes.getNotes, userId ? { userId } : "skip") || [];

  // Liaison de l'action Convex pour traiter l'audio
  const processAudio = useAction(api.actions.processAudio);

  // Liaison de la mutation Convex pour supprimer une note
  const deleteNote = useMutation(api.notes.deleteNote);

  // Liaison de la mutation Convex pour cocher/décocher une tâche
  const toggleTodo = useMutation(api.notes.toggleTodo);

  // États de l'interface
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // État du tiroir mobile
  const [toasts, setToasts] = useState<Toast[]>([]); // Liste des toasts actifs
  const [selectedTag, setSelectedTag] = useState<string | null>(null); // Filtre thématique actif

  const [openMenuNoteId, setOpenMenuNoteId] = useState<string | null>(null); // ID de la note avec menu ouvert
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null); // ID de la note en cours de suppression
  const [modifyingNote, setModifyingNote] = useState<{ id: string; summary: string; dateStr: string } | null>(null); // Note en cours de modification

  // Dictionnaire pour suivre l'onglet actif de chaque note individuelle
  const [activeTabs, setActiveTabs] = useState<Record<string, "summary" | "todo">>({});

  // Références pour l'enregistrement audio
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isCancelledRef = useRef(false);
  const modifyingNoteRef = useRef<{ id: string; summary: string; dateStr: string } | null>(null);
  const processingStartTimeRef = useRef<number | null>(null);

  // Filtrage réactif des notes côté client (et masquage temporaire des nouvelles notes en cours de traitement)
  const filteredNotes = (() => {
    let list = selectedTag
      ? (notes as Note[]).filter((n) => n.tags?.includes(selectedTag))
      : (notes as Note[]);

    if (isProcessing && processingStartTimeRef.current !== null) {
      const startTime = processingStartTimeRef.current;
      list = list.filter((n) => n.createdAt < startTime);
    }
    return list;
  })();

  // Effet pour faire défiler la vue vers une note spécifiée dans l'URL (redirection RAG)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const targetNoteId = params.get("noteId");
      if (targetNoteId && notes.length > 0) {
        setTimeout(() => {
          const el = document.getElementById(`note-${targetNoteId}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
            // Nettoyage de l'URL pour éviter de re-scroller au rafraîchissement
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }, 500);
      }
    }
  }, [notes]);

  // Déclencher une notification Toast
  const showToast = (message: string, type: "success" | "error" | "warning") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Fermeture automatique après 4 secondes
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Compteur de durée d'enregistrement
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Lancer l'enregistrement
  const startRecording = async () => {
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (isCancelledRef.current) {
          isCancelledRef.current = false;
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await handleAudioProcessing(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(200);
      setIsRecording(true);
    } catch (err: any) {
      console.error("Erreur accès micro :", err);
      showToast("Impossible d'accéder au microphone. Vérifiez vos permissions.", "error");
    }
  };

  // Arrêter l'enregistrement
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Envoyer l'audio à Convex et Gemini
  const handleAudioProcessing = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setProcessingStep("Préparation de l'audio...");
    processingStartTimeRef.current = Date.now();

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      setProcessingStep("Analyse en cours par l'IA...");

      const result = await processAudio({
        userId,
        audioData: arrayBuffer,
        mimeType: audioBlob.type || "audio/webm",
        noteId: modifyingNoteRef.current?.id as any,
        existingSummary: modifyingNoteRef.current?.summary,
      });

      if (result.success) {
        const isUpdate = !!modifyingNoteRef.current;
        setProcessingStep(isUpdate ? "Note mise à jour avec succès !" : "Note structurée avec succès !");
        showToast(isUpdate ? "Note mise à jour avec succès !" : "Note enregistrée avec succès !", "success");

        setTimeout(() => {
          const targetId = result.noteId || modifyingNoteRef.current?.id;
          const firstNoteElement = document.getElementById(`note-${targetId}`);
          if (firstNoteElement) {
            firstNoteElement.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 500);
      } else {
        showToast("Audio incompréhensible ou non audible.", "error");
      }
    } catch (err: any) {
      console.error("Erreur traitement audio :", err);
      showToast("Audio incompréhensible ou non audible.", "error");
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
      processingStartTimeRef.current = null;
      modifyingNoteRef.current = null;
      setModifyingNote(null);
    }
  };

  // Traiter la suppression d'une note
  const handleDeleteNote = async (id: string) => {
    try {
      await deleteNote({ id: id as any, userId });
      showToast("Note supprimée avec succès !", "success");
    } catch (err: any) {
      console.error("Erreur suppression note :", err);
      showToast(`Échec de la suppression : ${err.message}`, "error");
    } finally {
      setNoteToDelete(null);
    }
  };

  // Cocher/décocher une tâche
  const handleToggleTodo = async (noteId: string, index: number) => {
    try {
      await toggleTodo({ noteId: noteId as any, index, userId });
    } catch (err: any) {
      console.error("Erreur toggle todo :", err);
      showToast("Impossible de modifier le statut de la tâche.", "error");
    }
  };

  // Copier le texte dans le presse-papiers
  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(type);
    showToast("Copié dans le presse-papiers !", "success");
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Défilement fluide vers une note
  const scrollToNote = (noteId: string) => {
    const el = document.getElementById(`note-${noteId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setIsSidebarOpen(false); // Fermer le menu mobile
    }
  };

  // Obtenir l'onglet actif d'une note
  const getNoteActiveTab = (noteId: string) => {
    return activeTabs[noteId] || "summary";
  };

  // Changer l'onglet d'une note
  const setNoteActiveTab = (noteId: string, tab: "summary" | "todo") => {
    setActiveTabs((prev) => ({ ...prev, [noteId]: tab }));
  };

  // Enclencher le mode modification et démarrer l'enregistrement immédiatement
  const startModifyingNote = (noteId: string, summary: string, dateStr: string) => {
    const noteData = { id: noteId, summary, dateStr };
    modifyingNoteRef.current = noteData;
    setModifyingNote(noteData);
    startRecording();
  };

  // Annuler le mode modification
  const cancelModifyingNote = () => {
    isCancelledRef.current = true;
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    modifyingNoteRef.current = null;
    setModifyingNote(null);
    showToast("Modification annulée.", "warning");
  };

  return {
    userId,
    notes: notes as Note[],
    filteredNotes,
    selectedTag,
    setSelectedTag,
    isRecording,
    recordingDuration,
    isProcessing,
    processingStep,
    copiedText,
    isSidebarOpen,
    setIsSidebarOpen,
    toasts,
    openMenuNoteId,
    setOpenMenuNoteId,
    noteToDelete,
    setNoteToDelete,
    modifyingNote,
    startRecording,
    stopRecording,
    handleDeleteNote,
    handleToggleTodo,
    copyToClipboard,
    scrollToNote,
    getNoteActiveTab,
    setNoteActiveTab,
    startModifyingNote,
    cancelModifyingNote,
  };
}
