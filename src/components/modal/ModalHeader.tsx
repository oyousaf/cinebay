"use client";

import { ArrowLeft, X } from "lucide-react";

interface ModalHeaderProps {
  onClose: () => void;
  onBack?: () => void;
}

export default function ModalHeader({ onClose, onBack }: ModalHeaderProps) {
  const buttonBase =
    "pointer-events-auto inline-flex items-center justify-center " +
    "h-10 w-10 2xl:h-14 2xl:w-14 rounded-full " +
    "bg-[hsl(var(--background))] ring-1 ring-[hsl(var(--foreground)/0.25)] " +
    "text-[hsl(var(--foreground))] transition " +
    "hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 " +
    "focus-visible:ring-[hsl(var(--foreground))]";

  const iconClass = "w-5 h-5 2xl:w-7 2xl:h-7";

  return (
    <div className="absolute top-4 left-4 right-4 2xl:top-6 2xl:left-6 2xl:right-6 z-50 flex items-center justify-between pointer-events-none">
      {onBack ? (
        <button
          onClick={onBack}
          aria-label="Go back"
          className={buttonBase}
        >
          <ArrowLeft className={iconClass} />
        </button>
      ) : (
        <span className="h-10 w-10 2xl:h-14 2xl:w-14" />
      )}

      <button
        onClick={onClose}
        aria-label="Close modal"
        className={buttonBase}
      >
        <X className={iconClass} />
      </button>
    </div>
  );
}
