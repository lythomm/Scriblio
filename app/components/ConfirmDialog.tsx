"use client";

import React from "react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-neutral-900/40 z-50 flex items-center justify-center p-4 transition-opacity duration-200 backdrop-blur-[1px]">
      <div className="bg-canvas border border-hairline rounded-lg shadow-elevated w-full max-w-sm overflow-hidden animate-fade-in-down">
        <div className="p-6">
          <h3 className="text-base font-bold text-ink tracking-heading-3 mb-2">
            {title}
          </h3>
          <p className="text-sm text-ink-muted leading-relaxed">
            {message}
          </p>
        </div>
        <div className="px-6 py-4 bg-canvas-soft/40 border-t border-hairline flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-hairline bg-canvas hover:bg-canvas-soft text-xs font-semibold text-ink-secondary transition-colors cursor-pointer"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}
