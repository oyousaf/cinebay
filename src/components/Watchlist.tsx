import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react";

import {
  getWatchlist,
  removeFromWatchlist,
  saveToWatchlist,
} from "@/lib/watchlist";
import type { Movie } from "@/types/movie";
import ConfirmModal from "@/components/ConfirmModal";
import { TMDB_IMAGE } from "@/lib/tmdb";

const LONG_PRESS_DELAY = 600;

type FilterState = {
  type: "all" | "movie" | "tv";
  sortBy: "title-asc" | "title-desc" | "rating-desc" | "newest";
};

const defaultFilters: FilterState = {
  type: "all",
  sortBy: "title-asc",
};

export default function Watchlist({
  onSelect,
}: {
  onSelect: (movie: Movie) => void;
}) {
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [toRemove, setToRemove] = useState<Movie | null>(null);
  const [filters, setFilters] = useState<FilterState>(() => {
    try {
      const stored = localStorage.getItem("watchlistFilters");
      return stored ? JSON.parse(stored) : defaultFilters;
    } catch {
      return defaultFilters;
    }
  });

  useEffect(() => {
    const load = () => {
      setWatchlist(getWatchlist());
      setLoading(false);
    };
    "requestIdleCallback" in window
      ? requestIdleCallback(load)
      : setTimeout(load, 250);
  }, []);

  useEffect(() => {
    localStorage.setItem("watchlistFilters", JSON.stringify(filters));
  }, [filters]);

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
          className="text-yellow-400 hover:underline flex-shrink-0 whitespace-nowrap cursor-pointer"
        >
          Undo
        </button>
      </div>
    ));

    setToRemove(null);
  };

  const filteredList = watchlist
    .filter((m) => filters.type === "all" || m.media_type === filters.type)
    .sort((a, b) => {
      const titleA = a.title || a.name || "";
      const titleB = b.title || b.name || "";
      switch (filters.sortBy) {
        case "title-asc":
          return titleA.localeCompare(titleB);
        case "title-desc":
          return titleB.localeCompare(titleA);
        case "rating-desc":
          return (b.vote_average ?? 0) - (a.vote_average ?? 0);
        case "newest":
          return (
            new Date(b.release_date || "").getTime() -
            new Date(a.release_date || "").getTime()
          );
        default:
          return 0;
      }
    });

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
            <>
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="mb-6 flex flex-wrap justify-center items-center gap-4 text-sm sm:text-base"
              >
                <select
                  value={filters.type}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      type: e.target.value as FilterState["type"],
                    }))
                  }
                  className="bg-zinc-900 text-white border border-zinc-700 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="all">All Types</option>
                  <option value="movie">Movies</option>
                  <option value="tv">TV Shows</option>
                </select>

                <select
                  value={filters.sortBy}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      sortBy: e.target.value as FilterState["sortBy"],
                    }))
                  }
                  className="bg-zinc-900 text-white border border-zinc-700 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="title-asc">Title A–Z</option>
                  <option value="title-desc">Title Z–A</option>
                  <option value="rating-desc">Top Rated</option>
                  <option value="newest">Newest First</option>
                </select>

                <button
                  onClick={() => setFilters(defaultFilters)}
                  className="text-sm text-white bg-zinc-800 px-3 py-1 rounded border border-zinc-700 hover:bg-zinc-700 transition"
                >
                  Reset
                </button>
              </motion.div>

              <motion.div
                layout
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4"
              >
                <AnimatePresence mode="sync">
                  {filteredList.map((movie) => {
                    let pressTimer: NodeJS.Timeout;
                    return (
                      <motion.div
                        key={movie.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        onClick={() => onSelect(movie)}
                        onPointerDown={() => {
                          pressTimer = setTimeout(() => {
                            setToRemove(movie);
                          }, LONG_PRESS_DELAY);
                        }}
                        onPointerUp={() => clearTimeout(pressTimer)}
                        onPointerLeave={() => clearTimeout(pressTimer)}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragSnapToOrigin
                        dragElastic={0.2}
                        whileDrag={{ scale: 0.97, backgroundColor: "#7f1d1d" }}
                        onDragEnd={(e, info) => {
                          if (info.offset.x < -100) setToRemove(movie);
                        }}
                        whileHover={{
                          scale: 1.03,
                          transition: {
                            type: "spring",
                            stiffness: 300,
                            damping: 20,
                          },
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
                            ((e.target as HTMLImageElement).src =
                              "/fallback.jpg")
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
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            </>
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
