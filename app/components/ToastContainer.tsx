"use client";

import React from "react";
import { Check, X, AlertTriangle } from "lucide-react";
import { Toast } from "../hooks/useNotes";

interface ToastContainerProps {
  toasts: Toast[];
}

export default function ToastContainer({ toasts }: ToastContainerProps) {
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2.5 w-full max-w-sm px-4 pointer-events-none">
      {toasts.map((t) => {
        let bgClass = "";
        let icon = null;
        
        if (t.type === "success") {
          bgClass = "bg-emerald-50 border-emerald-200 text-emerald-800";
          icon = <Check size={18} className="text-emerald-600 shrink-0" />;
        } else if (t.type === "error") {
          bgClass = "bg-red-50 border-red-200 text-red-800";
          icon = <X size={18} className="text-red-600 shrink-0" />;
        } else if (t.type === "warning") {
          bgClass = "bg-amber-50 border-amber-200 text-amber-800";
          icon = <AlertTriangle size={18} className="text-amber-600 shrink-0" />;
        }
        
        return (
          <div
            key={t.id}
            className={`flex items-center gap-3.5 px-4.5 py-3 rounded-lg border shadow-lg pointer-events-auto transition-all duration-300 transform translate-y-0 animate-fade-in-down ${bgClass}`}
          >
            {icon}
            <span className="text-sm font-semibold leading-normal">{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
