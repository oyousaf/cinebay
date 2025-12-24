import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RefreshCw } from "lucide-react";
import React from "react";
import type { Movie } from "@/types/movie";
import { TMDB_IMAGE } from "@/lib/tmdb";
import { useWatchlist } from "@/context/WatchlistContext";
import { useNavigation } from "@/hooks/useNavigation";
import { useVideoEmbed } from "@/hooks/useVideoEmbed";

/* ---------- Filter Types ---------- */
type FilterState = {
  sortBy: "title-asc" | "title-desc" | "rating-desc" | "newest";
  type: "all" | "movie" | "tv";
};

const defaultFilters: FilterState = {
  sortBy: "rating-desc",
  type: "all",
};

/* ---------- Tile ---------- */
const WatchlistTile = React.memo(function WatchlistTile({
  movie,
  isFocused,
  onFocus,
  onWatch,
  onRemove,
}: {
  movie: Movie;
  isFocused: boolean;
  onFocus: () => void;
  onWatch: (url: string) => void;
  onRemove: () => void;
}) {
  const embedUrl = useVideoEmbed(movie.id, movie.media_type);
  const showStatus = movie.status === "new" || movie.status === "renewed";

  return (
    <motion.button
      layout
      type="button"
      onClick={() => {
        onFocus();
        if (embedUrl) onWatch(embedUrl);
      }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      className={`relative group rounded-xl overflow-hidden bg-black/70 backdrop-blur-sm
        ${
          isFocused
            ? "ring-4 ring-[#80ffcc] shadow-pulse z-40"
            : "hover:ring-2 hover:ring-[#80ffcc]/40 z-10"
        }`}
      aria-selected={isFocused}
    >
      <img
        src={
          movie.poster_path
            ? `${TMDB_IMAGE}${movie.poster_path}`
            : "/fallback.jpg"
        }
        alt={movie.title || movie.name}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={(e) => ((e.target as HTMLImageElement).src = "/fallback.jpg")}
      />

      {showStatus && (
        <div
          className="absolute top-2 left-2 bg-[hsl(var(--foreground))]
          text-[hsl(var(--background))] text-[10px] md:text-xs font-bold
          px-2 py-0.5 rounded-full uppercase shadow-md"
        >
          {movie.status!.toUpperCase()}
        </div>
      )}

      <motion.button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="absolute top-2 right-2 p-2 bg-red-500/20 text-red-400
          rounded-full hover:bg-red-500/30 transition"
        aria-label="Remove from Watchlist"
      >
        <X size={18} strokeWidth={2.3} />
      </motion.button>
    </motion.button>
  );
});

/* ---------- Main ---------- */
export default function Watchlist({
  onWatch,
  onSelect,
}: {
  onWatch: (url: string) => void;
  onSelect: (movie: Movie) => void;
}) {
  const { watchlist, toggleWatchlist } = useWatchlist();

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

  const filteredList = watchlist
    .filter((m) => filters.type === "all" || m.media_type === filters.type)
    .sort((a, b) => {
      const ta = a.title || a.name || "";
      const tb = b.title || b.name || "";
      switch (filters.sortBy) {
        case "rating-desc":
          return (b.vote_average ?? 0) - (a.vote_average ?? 0);
        case "newest":
          return (
            new Date(b.release_date || "").getTime() -
            new Date(a.release_date || "").getTime()
          );
        case "title-asc":
          return ta.localeCompare(tb);
        case "title-desc":
          return tb.localeCompare(ta);
        default:
          return 0;
      }
    });

  const { focus, setFocus, registerRail, updateRailLength } = useNavigation();
  const [railIndex, setRailIndex] = useState<number | null>(null);

  useEffect(() => {
    if (railIndex === null) {
      setRailIndex(registerRail(filteredList.length));
    } else {
      updateRailLength(railIndex, filteredList.length);
    }
  }, [filteredList.length, railIndex, registerRail, updateRailLength]);

  return (
    <div className="min-h-screen w-full">
      <AnimatePresence mode="wait">
        <motion.main
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.6 }}
          className="pt-10 px-4 max-w-6xl mx-auto pb-12"
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center">
            Watchlist
          </h1>

          {watchlist.length === 0 ? (
            <p className="text-center text-2xl italic">
              Plot twist: nothing saved yet.
            </p>
          ) : (
            <>
              {/* Filters */}
              <div className="mb-6 flex flex-wrap justify-center gap-4">
                <select
                  value={filters.sortBy}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      sortBy: e.target.value as FilterState["sortBy"],
                    }))
                  }
                  className="px-3 py-2 rounded-md"
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
                  className="px-3 py-2 rounded-md"
                >
                  <option value="all">All</option>
                  <option value="movie">Movies</option>
                  <option value="tv">TV</option>
                </select>

                <button
                  onClick={() => setFilters(defaultFilters)}
                  className="p-2 rounded-full"
                >
                  <RefreshCw size={20} />
                </button>
              </div>

              {/* Grid */}
              <motion.div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-3">
                <AnimatePresence>
                  {filteredList.map((movie, idx) => (
                    <WatchlistTile
                      key={movie.id}
                      movie={movie}
                      isFocused={
                        railIndex !== null &&
                        focus.section === railIndex &&
                        focus.index === idx
                      }
                      onFocus={() =>
                        railIndex !== null &&
                        setFocus({ section: railIndex, index: idx })
                      }
                      onWatch={onWatch}
                      onRemove={() => toggleWatchlist(movie)}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            </>
          )}
        </motion.main>
      </AnimatePresence>
    </div>
  );
}
