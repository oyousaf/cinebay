"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export default function ExitConfirmModal({
  open,
  onCancel,
  onExit,
}: {
  open: boolean;
  onCancel: () => void;
  onExit: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  /* ----------------------------------
     Keyboard handling
  ---------------------------------- */
  useEffect(() => {
    if (!open) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
      if (e.key === "Enter") {
        e.preventDefault();
        onExit();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onCancel, onExit]);

  /* ----------------------------------
     Auto-focus primary action
  ---------------------------------- */
  useEffect(() => {
    if (!open) return;
    const btn = dialogRef.current?.querySelector<HTMLButtonElement>(
      "[data-primary]"
    );
    btn?.focus();
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="exit-confirm-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(var(--background))]/80 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel} 
        >
          {/* Surface */}
          <motion.div
            ref={dialogRef}
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl bg-[hsl(var(--background))] ring-2 ring-[hsl(var(--foreground))]
                       shadow-[0_30px_80px_rgba(0,0,0,0.8)] p-6 text-[hsl(var(--foreground))]"
          >
            {/* Close */}
            <button
              onClick={onCancel}
              aria-label="Cancel exit"
              className="absolute top-4 right-4 opacity-60 hover:opacity-100 transition"
            >
              <X size={22} />
            </button>

            {/* Title */}
            <h2
              id="exit-confirm-title"
              className="text-2xl font-bold text-center mb-3"
            >
              Roll Credits?
            </h2>

            {/* Body */}
            <p className="text-center opacity-80 mb-6">
              You’re about to leave CineBay.
            </p>

            {/* Actions */}
            <div className="flex justify-center gap-4">
              {/* Secondary */}
              <motion.button
                onClick={onCancel}
                whileTap={{ scale: 0.96 }}
                className="px-6 py-3 rounded-full font-semibold border border-[hsl(var(--foreground)/0.3)] 
                hover:bg-[hsl(var(--foreground)/0.08)]transition"
              >
                Stay
              </motion.button>

              {/* Primary */}
              <motion.button
                data-primary
                onClick={onExit}
                whileTap={{ scale: 0.96 }}
                className="px-6 py-3 rounded-full font-semibold bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
              >
                Exit
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}