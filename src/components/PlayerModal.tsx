import { useEffect, useRef, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function PlayerModal({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  // fallback if iframe takes too long
  useEffect(() => {
    timeoutRef.current = window.setTimeout(() => {
      if (!loaded) setError(true);
    }, 10000); // 10 sec

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [url]);

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
          {!loaded && !error && (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}

          {error ? (
            <div className="absolute inset-0 flex items-center justify-center text-white px-6 text-center text-sm sm:text-base">
              Sorry, the video could not be loaded. Please try again later or
              use another source.
            </div>
          ) : (
            <iframe
              src={url}
              allowFullScreen
              className="w-full h-full border-none"
              onLoad={() => setLoaded(true)}
              onError={() => setError(true)}
            />
          )}

          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-white hover:text-yellow-400 z-20"
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
