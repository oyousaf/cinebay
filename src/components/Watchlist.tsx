import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { X, RefreshCw } from "lucide-react";

import type { Movie } from "@/types/movie";
import ConfirmModal from "@/components/ConfirmModal";
import { TMDB_IMAGE } from "@/lib/tmdb";

const LONG_PRESS_DELAY = 600;

type FilterState = {
  sortBy: "title-asc" | "title-desc" | "rating-desc" | "newest";
  type: "all" | "movie" | "tv";
};

const defaultFilters: FilterState = {
  sortBy: "rating-desc",
  type: "all",
};

export default function Watchlist({
  items,
  onSelect,
  onUpdate,
}: {
  items: Movie[];
  onSelect: (movie: Movie) => void;
  onUpdate: (updated: Movie[]) => void;
}) {
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
    localStorage.setItem("watchlistFilters", JSON.stringify(filters));
  }, [filters]);

  const confirmRemove = () => {
    if (!toRemove) return;
    const updated = items.filter((m) => m.id !== toRemove.id);
    onUpdate(updated);

    toast.error(
      <div className="flex items-center justify-between gap-4 w-full">
        <span>
          Removed <strong>{toRemove.title}</strong>
        </span>
        <button
          onClick={() => {
            onUpdate([toRemove!, ...updated]);
            toast.success(
              <span>
                Restored <strong>{toRemove.title}</strong>
              </span>
            );
          }}
          className="text-yellow-400 hover:underline whitespace-nowrap"
        >
          Undo
        </button>
      </div>
    );

    setToRemove(null);
  };

  const filteredList = items
    .filter((m) => filters.type === "all" || m.media_type === filters.type)
    .sort((a, b) => {
      const titleA = a.title || a.name || "";
      const titleB = b.title || b.name || "";
      switch (filters.sortBy) {
        case "rating-desc":
          return (b.vote_average ?? 0) - (a.vote_average ?? 0);
        case "newest":
          return (
            new Date(b.release_date || "").getTime() -
            new Date(a.release_date || "").getTime()
          );
        case "title-asc":
          return titleA.localeCompare(titleB);
        case "title-desc":
          return titleB.localeCompare(titleA);
        default:
          return 0;
      }
    });

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-foreground via-foreground to-black">
      <AnimatePresence mode="wait">
        <motion.main
          key="watchlist"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="pt-[150px] px-4 max-w-6xl mx-auto pb-12"
        >
          <h1 className="font-heading text-3xl md:text-5xl font-bold mb-8 text-center tracking-wide drop-shadow-md">
            Watchlist
          </h1>

          {items.length === 0 ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="italic text-center"
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
                className="mb-6 flex flex-wrap justify-center items-center gap-4 text-base md:text-lg"
              >
                <select
                  value={filters.sortBy}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      sortBy: e.target.value as FilterState["sortBy"],
                    }))
                  }
                  className="rounded-md bg-[hsl(var(--background))] text-[hsl(var(--foreground))] border border-[hsl(var(--foreground))]/40 px-3 py-2 shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-[hsl(var(--foreground))]/60 transition"
                  aria-label="Sort by"
                >
                  <option value="rating-desc">Top Rated</option>
                  <option value="newest">Newest</option>
                  <option value="title-asc">Title A–Z</option>
                  <option value="title-desc">Title Z–A</option>
                </select>

                <select
                  value={filters.type}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      type: e.target.value as FilterState["type"],
                    }))
                  }
                  className="rounded-md bg-[hsl(var(--background))] text-[hsl(var(--foreground))] border border-[hsl(var(--foreground))]/40 px-3 py-2 shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-[hsl(var(--foreground))]/60 transition"
                  aria-label="Filter by type"
                >
                  <option value="all">All Types</option>
                  <option value="movie">Movies</option>
                  <option value="tv">TV Shows</option>
                </select>

                <button
                  onClick={() => setFilters(defaultFilters)}
                  className="p-2 rounded-full border bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90 hover:shadow-[0_0_8px_hsla(var(--foreground)/0.4)] transition flex items-center justify-center"
                  aria-label="Reset filters"
                >
                  <RefreshCw className="w-5 h-5" strokeWidth={2.5} />
                </button>
              </motion.div>

              <motion.div
                layout
                className="grid grid-cols-3 md:grid-cols-5 gap-4"
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
                          <div className="absolute top-2 left-2 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-[10px] sm:text-xs md:text-sm font-bold px-2 py-0.5 rounded-full uppercase shadow-pulse">
                            NEW
                          </div>
                        )}
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            setToRemove(movie);
                          }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.92 }}
                          className="absolute top-2 right-2 p-2 sm:p-2.5 md:p-3 bg-red-500/20 backdrop-blur-md text-red-400 rounded-full shadow-md hover:bg-red-500/30 hover:shadow-[0_0_8px_#ef4444] focus:outline-none focus:ring-2 focus:ring-red-400/60 transition duration-200"
                          aria-label="Remove from Watchlist"
                        >
                          <X
                            size={20}
                            className="sm:w-6 sm:h-6 md:w-7 md:h-7"
                            strokeWidth={2.5}
                          />
                        </motion.button>
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
