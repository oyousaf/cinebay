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

  // ✅ Keyboard handling
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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="exit-confirm-title"
          ref={dialogRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(var(--background))]/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative w-[90vw] max-w-md mx-auto rounded-2xl 
                       text-[hsl(var(--foreground))] border-5 
                       bg-linear-to-b from-[hsl(var(--background))]/90 
                       to-[hsl(var(--background))]/95 shadow-2xl p-6"
          >
            {/* Close button */}
            <button
              onClick={onCancel}
              aria-label="Cancel exit"
              className="absolute top-3 right-3 hover:text-red-500"
            >
              <X size={22} />
            </button>

            {/* Title */}
            <h2
              id="exit-confirm-title"
              className="text-2xl font-bold mb-4 text-center"
            >
              Roll Credits? 🎬
            </h2>

            {/* Body */}
            <p className="text-center mb-6">
              You’re about to leave Cinebay. Are you sure you want to exit?
            </p>

            {/* Actions */}
            <div className="flex justify-center gap-4">
              <button
                onClick={onCancel}
                className="px-5 py-2 rounded-full border-3 
                           hover:bg-[hsl(var(--foreground))] 
                           hover:text-[hsl(var(--background))] 
                           transition"
              >
                Stay for the Sequel
              </button>
              <button
                onClick={onExit}
                className="px-5 py-2 rounded-full bg-red-600 
                           text-white hover:bg-red-500 transition"
              >
                Exit CineBay
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
