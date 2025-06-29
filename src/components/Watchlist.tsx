import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { getWatchlist, removeFromWatchlist } from "@/lib/watchlist";
import type { Movie } from "@/types/movie";

import Modal from "@/components/Modal";
import ConfirmModal from "@/components/ConfirmModal";

export default function Watchlist() {
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [selected, setSelected] = useState<Movie | null>(null);
  const [toRemove, setToRemove] = useState<Movie | null>(null);

  useEffect(() => {
    setWatchlist(getWatchlist());
  }, []);

  const handleRemove = () => {
    if (!toRemove) return;
    removeFromWatchlist(toRemove.id);
    setWatchlist((prev) => prev.filter((m) => m.id !== toRemove.id));
    toast.success("Removed from Watchlist");
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
            Your Watchlist
          </h1>

          {watchlist.length === 0 ? (
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
              className="grid grid-cols-3 md:grid-cols-5 gap-4"
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
                    whileHover={{
                      scale: 1.07,
                      transition: {
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                      },
                    }}
                    className="relative group cursor-pointer rounded-xl overflow-hidden shadow-xl"
                    onClick={() => setSelected(movie)}
                  >
                    <img
                      src={
                        movie.poster_path
                          ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                          : "/fallback.jpg"
                      }
                      alt={movie.title}
                      className="w-full object-cover"
                    />

                    {movie.isNew && (
                      <div
                        className="absolute top-2 left-2 bg-amber-400 text-black text-xs font-bold px-2 py-0.5 rounded shadow"
                        style={{
                          boxShadow: "0 0 6px #fbbf24, 0 0 12px #facc15",
                        }}
                      >
                        NEW
                      </div>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setToRemove(movie);
                      }}
                      className="absolute top-2 right-2 bg-black/60 text-white p-1.5 cursor-pointer rounded-full hover:bg-red-600 hover:text-white shadow transition"
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
              onConfirm={handleRemove}
              onCancel={() => setToRemove(null)}
            />
          )}
        </motion.main>
      </AnimatePresence>

      {selected && <Modal movie={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
