"use client";

import React from "react";
import { Mic, FileText, MessageSquare, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

export default function Sidebar({
  isSidebarOpen,
  setIsSidebarOpen,
}: SidebarProps) {
  const pathname = usePathname();

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
      <aside className={`fixed inset-y-0 left-0 z-45 w-72 bg-canvas border-r border-hairline flex flex-col shrink-0 transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
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

        {/* Liens de navigation */}
        <nav className="flex-1 p-4 space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-semibold transition-all duration-150 cursor-pointer ${
                  isActive 
                    ? "bg-sky-50 text-sky-850 border-l-4 border-primary pl-2 shadow-soft" 
                    : "text-ink-secondary hover:bg-canvas-soft hover:text-ink"
                }`}
              >
                <Icon size={18} className={isActive ? "text-primary" : "text-ink-muted"} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
        
        {/* Footer Sidebar */}
        <div className="p-4 border-t border-hairline bg-canvas-soft/40 flex justify-between items-center text-xs text-ink-faint">
          <span className="flex items-center gap-1"><Mic size={12} /> Scriblio</span>
          <span>Google Gen AI SDK v2</span>
        </div>
      </aside>
    </>
  );
}
