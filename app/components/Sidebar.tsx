"use client";

import React from "react";
import { Mic, FileText, MessageSquare, X, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

export default function Sidebar({
  isSidebarOpen,
  setIsSidebarOpen,
}: SidebarProps) {
  const pathname = usePathname();
  const { signOut } = useAuthActions();

  const menuItems = [
    { name: "Tableau de Bord", href: "/", icon: Mic },
    { name: "Mes notes", href: "/notes", icon: FileText },
    { name: "Poser une question", href: "/ask", icon: MessageSquare },
  ];

  return (
    <>
      {/* Overlay Backdrop pour la barre latérale sur mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-neutral-900/40 z-40 md:hidden transition-opacity duration-200"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Barre latérale : Menu de navigation */}
      <aside className={`fixed inset-y-0 left-0 z-45 w-72 bg-canvas border-r border-hairline flex flex-col shrink-0 transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}>

        {/* Titre / Identité de l'application */}
        <div className="p-5 border-b border-hairline flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Scriblio Logo" className="w-6 h-6 rounded-md object-cover shadow-soft" />
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

        {/* Liens de navigation */}
        <nav className="flex-1 p-4 flex flex-col justify-between">
          <div className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-bold transition-all duration-150 cursor-pointer ${isActive
                    ? "bg-canvas-soft text-ink shadow-soft"
                    : "text-ink-secondary hover:bg-canvas-soft/50 hover:text-ink"
                    }`}
                >
                  <Icon size={18} className={isActive ? "text-primary" : "text-ink-muted"} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          <button
            onClick={() => void signOut()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-bold text-red-650 hover:bg-red-50 hover:text-red-700 transition-all duration-150 cursor-pointer"
          >
            <LogOut size={18} className="text-red-500" />
            <span>Se déconnecter</span>
          </button>
        </nav>


        {/* Footer Sidebar */}
        <div className="p-4 border-t border-hairline bg-canvas-soft/40 flex justify-between items-center text-xs text-ink-faint">
          <span className="flex items-center gap-1"><Mic size={12} /> Scriblio.IA</span>
          <span>troispixels.com</span>
        </div>
      </aside>
    </>
  );
}
