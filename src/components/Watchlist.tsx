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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, x: -40 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      tabIndex={0}
      onClick={() => {
        onFocus();
        if (embedUrl) onWatch(embedUrl);
      }}
      whileHover={{
        scale: 1.04,
        transition: { type: "spring", stiffness: 250, damping: 20 },
      }}
      className={`relative group cursor-pointer rounded-xl overflow-hidden bg-black/80 backdrop-blur-sm transition-all duration-300 
        ${
          isFocused
            ? "ring-4 ring-[#80ffcc] shadow-pulse scale-105"
            : "hover:ring-2 hover:ring-[#80ffcc]/40"
        }
      `}
    >
      <img
        src={
          movie.poster_path
            ? `${TMDB_IMAGE}${movie.poster_path}`
            : "/fallback.jpg"
        }
        alt={movie.title || movie.name}
        className="w-full h-full object-cover"
        onError={(e) => ((e.target as HTMLImageElement).src = "/fallback.jpg")}
        loading="lazy"
      />

      {movie.isNew && (
        <div className="absolute top-2 left-2 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full uppercase shadow-md shadow-pulse">
          NEW
        </div>
      )}

      <motion.button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="absolute top-2 right-2 p-2 md:p-3 bg-red-500/20 text-red-400 rounded-full shadow hover:bg-red-500/30 focus:outline-none focus:ring-2 focus:ring-red-400/50"
        aria-label="Remove from Watchlist"
      >
        <X size={20} strokeWidth={2.4} />
      </motion.button>
    </motion.div>
  );
});

/* ---------- Main Watchlist ---------- */
export default function Watchlist({
  onWatch,
  onSelect,
}: {
  onWatch: (url: string) => void;
  onSelect: (movie: Movie) => void;
}) {
  const { watchlist, toggleWatchlist } = useWatchlist();

  /* ---------- Filters ---------- */
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

  /* ---------- Navigation Integration ---------- */
  const { focus, setFocus, registerRail, updateRailLength } = useNavigation();
  const [railIndex, setRailIndex] = useState<number | null>(null);
  const tileRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (railIndex === null) {
      const idx = registerRail(filteredList.length);
      setRailIndex(idx);
    } else {
      updateRailLength(railIndex, filteredList.length);
    }
  }, [filteredList.length, railIndex, registerRail, updateRailLength]);

  useEffect(() => {
    if (railIndex !== null && focus.section === railIndex) {
      const el = tileRefs.current[focus.index];
      el?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [focus, railIndex]);

  /* ---------- Keyboard / Remote Controls ---------- */
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (railIndex === null || focus.section !== railIndex) return;
      const movie = filteredList[focus.index];
      if (!movie) return;

      switch (e.key) {
        case "i":
        case "Info":
          e.preventDefault();
          onSelect(movie);
          break;
        case "Enter":
        case "Return":
        case "p":
        case "MediaPlayPause":
          e.preventDefault();
          const url = useVideoEmbed(movie.id, movie.media_type);
          if (url) onWatch(url);
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focus, railIndex, filteredList, onSelect, onWatch]);

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-foreground via-foreground to-black">
      <AnimatePresence mode="wait">
        <motion.main
          key="watchlist"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="pt-[120px] px-4 max-w-6xl mx-auto pb-12"
        >
          {watchlist.length === 0 ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="italic font-heading text-3xl md:text-4xl font-bold mb-8 text-center tracking-wide drop-shadow-md"
            >
              Plot twist: you haven’t added anything yet.
            </motion.p>
          ) : (
            <>
              {/* Filters */}
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

              {/* Grid */}
              <motion.div
                layout
                className="grid grid-cols-3 md:grid-cols-5 gap-4"
              >
                <AnimatePresence mode="sync">
                  {filteredList.map((movie, idx) => {
                    const isFocused =
                      railIndex !== null &&
                      focus.section === railIndex &&
                      focus.index === idx;

                    return (
                      <WatchlistTile
                        key={movie.id}
                        movie={movie}
                        isFocused={isFocused}
                        onFocus={() => {
                          if (railIndex !== null)
                            setFocus({ section: railIndex, index: idx });
                        }}
                        onWatch={onWatch}
                        onRemove={() => toggleWatchlist(movie)}
                      />
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            </>
          )}
        </motion.main>
      </AnimatePresence>
    </div>
  );
}
