"use client";

import { ArrowLeft, X } from "lucide-react";

interface ModalHeaderProps {
  onClose: () => void;
  onBack?: () => void;
}

export default function ModalHeader({ onClose, onBack }: ModalHeaderProps) {
  return (
    <div className="absolute top-3 left-3 right-3 z-50 flex items-center justify-between pointer-events-none">
      {onBack ? (
        <button
          onClick={onBack}
          aria-label="Go back"
          className="pointer-events-auto inline-flex items-center justify-center h-10 w-10 rounded-full 
          bg-[hsl(var(--background))] ring-1 ring-[hsl(var(--foreground)/0.25)] text-[hsl(var(--foreground))] 
          transition hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2
          focus-visible:ring-[hsl(var(--foreground))]"
        >
          <ArrowLeft size={20} />
        </button>
      ) : (
        <span className="h-10 w-10" />
      )}

      <button
        onClick={onClose}
        aria-label="Close modal"
        className="pointer-events-auto inline-flex items-center justify-center h-10 w-10 rounded-full 
        bg-[hsl(var(--background))] ring-1 ring-[hsl(var(--foreground)/0.25)] text-[hsl(var(--foreground))] 
        transition hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 
        focus-visible:ring-[hsl(var(--foreground))]"
      >
        <X size={20} />
      </button>
    </div>
  );
}
