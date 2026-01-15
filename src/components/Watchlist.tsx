"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RefreshCw } from "lucide-react";
import React from "react";

import type { Movie } from "@/types/movie";
import { TMDB_IMAGE } from "@/lib/tmdb";
import { useWatchlist } from "@/context/WatchlistContext";
import { useNavigation } from "@/hooks/useNavigation";

/* ---------- Filters ---------- */
type SortKey = "rating-desc" | "newest" | "title-asc" | "title-desc";
type TypeKey = "all" | "movie" | "tv";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "rating-desc", label: "Top Rated" },
  { key: "newest", label: "Newest" },
  { key: "title-asc", label: "A–Z" },
  { key: "title-desc", label: "Z–A" },
];

const TYPES: { key: TypeKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "movie", label: "Movies" },
  { key: "tv", label: "TV" },
];

const defaultFilters = {
  sortBy: "rating-desc" as SortKey,
  type: "all" as TypeKey,
};

/* ---------- Tile ---------- */
const WatchlistTile = React.memo(function WatchlistTile({
  movie,
  isFocused,
  onFocus,
  onSelect,
  onRemove,
}: {
  movie: Movie;
  isFocused: boolean;
  onFocus: () => void;
  onSelect: (movie: Movie) => void;
  onRemove: () => void;
}) {
  return (
    <motion.button
      layout
      type="button"
      onClick={() => {
        onFocus();
        onSelect(movie);
      }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={`
        group relative overflow-hidden rounded-xl
        focus-visible:ring-4 ring-[#80ffcc]
        ${isFocused ? "z-30" : "z-10"}
      `}
      aria-selected={isFocused}
    >
      <img
        src={
          movie.poster_path
            ? `${TMDB_IMAGE}${movie.poster_path}`
            : "/fallback.jpg"
        }
        alt={movie.title || movie.name}
        className="w-full h-full object-cover transition-opacity group-hover:opacity-90"
        loading="lazy"
        onError={(e) => ((e.target as HTMLImageElement).src = "/fallback.jpg")}
      />

      {/* Remove */}
      <motion.button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="
          absolute top-2 right-2
          p-2 rounded-full
          bg-black/60 backdrop-blur
          text-red-400
          opacity-0 group-hover:opacity-100
          transition
        "
        aria-label="Remove from Watchlist"
      >
        <X size={16} />
      </motion.button>
    </motion.button>
  );
});

/* ---------- Watchlist ---------- */
export default function Watchlist({
  onSelect,
}: {
  onSelect: (movie: Movie) => void;
}) {
  const { watchlist, toggleWatchlist } = useWatchlist();

  const [filters, setFilters] = useState(() => {
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

  const filteredList = useMemo(() => {
    return watchlist
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
  }, [watchlist, filters]);

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
    <motion.main
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen w-full"
    >
      {/* Header */}
      <div className="pt-10 pb-6 text-center">
        <h1 className="text-4xl font-bold">Watchlist</h1>
      </div>

      {/* Filters */}
      <div
        className="
        sticky top-0 z-20
        backdrop-blur-xl bg-black/40
        border-b border-white/10
        px-4 py-4
      "
      >
        <div className="max-w-6xl mx-auto flex flex-wrap gap-3 justify-center">
          {SORTS.map((s) => (
            <button
              key={s.key}
              data-active={filters.sortBy === s.key}
              onClick={() => setFilters((f) => ({ ...f, sortBy: s.key }))}
              className="
                px-4 py-2 rounded-full text-sm
                data-[active=true]:bg-white/10
                data-[active=true]:ring-1 ring-white/20
              "
            >
              {s.label}
            </button>
          ))}

          <span className="w-px bg-white/10 mx-2" />

          {TYPES.map((t) => (
            <button
              key={t.key}
              data-active={filters.type === t.key}
              onClick={() => setFilters((f) => ({ ...f, type: t.key }))}
              className="
                px-4 py-2 rounded-full text-sm
                data-[active=true]:bg-white/10
                data-[active=true]:ring-1 ring-white/20
              "
            >
              {t.label}
            </button>
          ))}

          <button
            onClick={() => setFilters(defaultFilters)}
            className="ml-2 px-3 py-2 rounded-full hover:bg-white/10"
            aria-label="Reset filters"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {filteredList.length === 0 ? (
          <p className="text-center text-xl italic opacity-70">
            Nothing queued yet.
          </p>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-4"
          >
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
                  onSelect={onSelect}
                  onRemove={() => toggleWatchlist(movie)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </motion.main>
  );
}
