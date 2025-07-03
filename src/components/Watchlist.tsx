import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react";

import ConfirmModal from "@/components/ConfirmModal";
import {
  getWatchlist,
  removeFromWatchlist,
  saveToWatchlist,
} from "@/lib/watchlist";
import type { Movie } from "@/types/movie";
import { TMDB_IMAGE } from "@/lib/tmdb";

export default function Watchlist({
  onSelect,
}: {
  onSelect: (movie: Movie) => void;
}) {
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [toRemove, setToRemove] = useState<Movie | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadWatchlist = useCallback(() => {
    setWatchlist(getWatchlist());
    setLoading(false);
  }, []);

  useEffect(() => {
    if ("requestIdleCallback" in window) {
      requestIdleCallback(loadWatchlist);
    } else {
      setTimeout(loadWatchlist, 250);
    }
  }, [loadWatchlist]);

  const confirmRemove = () => {
    if (!toRemove) return;

    removeFromWatchlist(toRemove.id);
    setWatchlist((prev) => prev.filter((m) => m.id !== toRemove.id));

    toast.custom((id) => (
      <div className="bg-zinc-900 text-white px-4 py-3 rounded shadow-lg flex items-center justify-between gap-4 w-full max-w-sm">
        <span className="flex-1 truncate">
          Removed <strong className="font-semibold">{toRemove.title}</strong>
        </span>
        <button
          onClick={() => {
            toast.dismiss(id);
            saveToWatchlist(toRemove);
            setWatchlist((prev) => [toRemove!, ...prev]);
          }}
          className="text-yellow-400 hover:underline flex-shrink-0 whitespace-nowrap"
        >
          Undo
        </button>
      </div>
    ));

    setToRemove(null);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-foreground via-foreground to-black text-white">
      <AnimatePresence mode="wait">
        <motion.main
          key="watchlist"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="pt-[176px] px-4 max-w-6xl mx-auto pb-12"
        >
          <h1 className="text-3xl sm:text-4xl font-bold mb-6 drop-shadow-md text-center">
            Watchlist
          </h1>

          {loading ? (
            <div className="flex justify-center pt-8">
              <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
            </div>
          ) : watchlist.length === 0 ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-background italic text-center"
            >
              Plot twist: you haven’t added anything yet.
            </motion.p>
          ) : (
            <motion.div
              layout
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4"
            >
              <AnimatePresence>
                {watchlist.map((movie) => (
                  <motion.div
                    key={movie.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ layout: { duration: 0.3 } }}
                    onClick={(e) => {
                      if (
                        Math.abs(
                          e.clientX -
                            e.currentTarget.getBoundingClientRect().left
                        ) < 5
                      ) {
                        onSelect(movie);
                      }
                    }}
                    whileHover={{
                      scale: 1.07,
                      transition: {
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                      },
                    }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragSnapToOrigin
                    dragElastic={0.2}
                    whileDrag={{ scale: 0.97, backgroundColor: "#7f1d1d" }}
                    onDragEnd={(e, info) => {
                      if (info.offset.x < -100) {
                        setToRemove(movie);
                      }
                    }}
                    onTouchStart={(e) => {
                      const timeout = setTimeout(() => {
                        setToRemove(movie);
                      }, 800);
                      const clear = () => clearTimeout(timeout);
                      const target = e.currentTarget;
                      target.addEventListener("touchend", clear, {
                        once: true,
                      });
                      target.addEventListener("touchmove", clear, {
                        once: true,
                      });
                    }}
                    className="relative group cursor-pointer rounded-xl overflow-hidden shadow-xl bg-black"
                  >
                    <img
                      src={
                        movie.poster_path
                          ? `${TMDB_IMAGE}${movie.poster_path}`
                          : "/fallback.jpg"
                      }
                      alt={movie.title}
                      className="w-full object-cover"
                      onError={(e) =>
                        ((e.target as HTMLImageElement).src = "/fallback.jpg")
                      }
                    />

                    {movie.isNew && (
                      <div className="absolute top-2 left-2 bg-amber-400 text-black shadow-[0_0_6px_#fbbf24,0_0_12px_#facc15] text-xs font-bold px-2 py-1 rounded">
                        NEW
                      </div>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setToRemove(movie);
                      }}
                      className="absolute top-2 right-2 bg-black/60 text-white p-1.5 cursor-pointer rounded-full hover:text-red-500 shadow transition"
                      aria-label="Remove from Watchlist"
                    >
                      <Trash2 size={16} strokeWidth={2} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {toRemove && (
            <ConfirmModal
              message={`Remove "${toRemove.title}" from your Watchlist?`}
              onConfirm={confirmRemove}
              onCancel={() => setToRemove(null)}
            />
          )}
        </motion.main>
      </AnimatePresence>
    </div>
  );
}
