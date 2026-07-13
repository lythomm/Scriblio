"use client";

import React from "react";
import Link from "next/link";

interface ButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  className?: string;
  variant?: "editorial" | "primary" | "secondary";
}

export default function Button({
  children,
  href,
  onClick,
  type = "button",
  disabled = false,
  className = "",
  variant = "editorial"
}: ButtonProps) {
  
  // Base classes that replicate the "Suggestions" layout and animation
  const baseClass = "py-3 px-4.5 rounded-xl text-xs font-bold transition-all duration-150 flex items-center justify-center gap-3 group cursor-pointer shadow-soft hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none";

  // Variant mappings matching our Plume & Papier styling
  const variantClasses = {
    editorial: "border border-hairline bg-canvas hover:bg-canvas-soft text-ink-secondary",
    primary: "bg-primary hover:bg-primary-active text-white border border-transparent",
    secondary: "border border-hairline bg-sky-50 text-sky-850 hover:bg-sky-100"
  };

  const combinedClass = `${baseClass} ${variantClasses[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={combinedClass}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={combinedClass}
    >
      {children}
    </button>
  );
}
