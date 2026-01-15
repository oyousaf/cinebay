"use client";

import { ArrowLeft, X } from "lucide-react";

export default function ModalHeader({
  onClose,
  onBack,
}: {
  onClose: () => void;
  onBack?: () => void;
}) {
  return (
    <div className="absolute top-3 left-3 right-3 z-50 flex justify-between">
      {onBack ? (
        <button
          onClick={onBack}
          className="p-2 rounded-full backdrop-blur-md bg-[hsl(var(--background))]"
        >
          <ArrowLeft size={22} />
        </button>
      ) : (
        <span />
      )}

      <button
        onClick={onClose}
        className="p-2 rounded-full backdrop-blur-md bg-[hsl(var(--background))]"
      >
        <X size={22} />
      </button>
    </div>
  );
}
