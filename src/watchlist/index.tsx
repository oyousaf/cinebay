import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getWatchlist, removeFromWatchlist } from "@/lib/watchlist";
import type { Movie } from "@/types/movie";
import Modal from "@/components/Modal";
import Navbar from "@/components/Navbar";
import ConfirmModal from "@/components/ConfirmModal";
import { toast } from "sonner";

export default function Watchlist() {
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [pendingRemove, setPendingRemove] = useState<Movie | null>(null);

  useEffect(() => {
    setWatchlist(getWatchlist());
  }, []);

  const confirmRemove = (movie: Movie) => setPendingRemove(movie);

  const handleRemove = () => {
    if (!pendingRemove) return;
    removeFromWatchlist(pendingRemove.id);
    setWatchlist((prev) => prev.filter((m) => m.id !== pendingRemove.id));
    toast.success("Removed from Watchlist");
    setPendingRemove(null);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-foreground via-foreground to-black text-white">
      <Navbar />

      {/* Page Animation Wrapper */}
      <AnimatePresence mode="wait">
        <motion.main
          key="watchlist"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="pt-[176px] px-4 max-w-6xl mx-auto pb-12"
        >
          <h1 className="text-3xl sm:text-4xl font-bold mb-6 drop-shadow-md">
            Your Watchlist
          </h1>

          {watchlist.length === 0 ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-zinc-400 italic"
            >
              You haven’t saved anything yet.
            </motion.p>
          ) : (
            <motion.div
              layout
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
            >
              {watchlist.map((movie) => (
                <motion.div
                  layout
                  key={movie.id}
                  className="relative group cursor-pointer rounded-xl overflow-hidden shadow-xl transition-transform hover:scale-105"
                  onClick={() => setSelectedMovie(movie)}
                  whileHover={{ scale: 1.03 }}
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmRemove(movie);
                    }}
                    className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded hover:bg-red-500"
                  >
                    Remove
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}

          {pendingRemove && (
            <ConfirmModal
              message={`Are you sure you want to remove "${pendingRemove.title}" from your Watchlist?`}
              onConfirm={handleRemove}
              onCancel={() => setPendingRemove(null)}
            />
          )}
        </motion.main>
      </AnimatePresence>

      {selectedMovie && (
        <Modal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />
      )}
    </div>
  );
}
