import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function PlayerModal({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      <motion.div
        key={url}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 backdrop-blur"
      >
        <div className="relative w-full max-w-6xl aspect-video bg-black shadow-2xl rounded-xl overflow-hidden">
          <iframe
            src={url}
            allowFullScreen
            className="w-full h-full border-none"
          />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-white hover:text-yellow-400"
          >
            <X
              size={28}
              className="p-1 bg-black/60 rounded-full backdrop-blur"
            />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
