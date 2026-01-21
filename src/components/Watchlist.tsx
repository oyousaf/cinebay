"use client";

import { useState, useEffect, useMemo, useDeferredValue } from "react";
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

type Filters = { sortBy: SortKey; type: TypeKey };

const SORTS = [
  { key: "rating-desc", label: "Top Rated" },
  { key: "newest", label: "Newest" },
  { key: "title-asc", label: "A–Z" },
  { key: "title-desc", label: "Z–A" },
] as const;

const TYPES = [
  { key: "all", label: "All" },
  { key: "movie", label: "Movies" },
  { key: "tv", label: "TV" },
] as const;

const defaultFilters: Filters = {
  sortBy: "rating-desc",
  type: "all",
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
    <motion.div
      layout
      tabIndex={0}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, x: -40, transition: { duration: 0.25 } }}
      onFocus={onFocus}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onSelect(movie);
        }
        if (e.key === "Delete") {
          e.preventDefault();
          onRemove();
        }
      }}
      className={`group relative rounded-xl overflow-hidden focus-visible:ring-4 ring-[#80ffcc]
        ${isFocused ? "z-30" : "z-10"}`}
    >
      <button
        type="button"
        onClick={() => onSelect(movie)}
        className="relative block w-full h-full bg-black"
        aria-label={`Open ${movie.title || movie.name}`}
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
          onError={(e) =>
            ((e.target as HTMLImageElement).src = "/fallback.jpg")
          }
        />

        <button
          type="button"
          aria-label="Remove from watchlist"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-2 right-2 rounded-full bg-black/60 backdrop-blur text-red-400 transition
          p-3 sm:p-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        >
          <X size={16} />
        </button>
      </button>
    </motion.div>
  );
});

/* ---------- Filter Pill ---------- */
function FilterPill({
  active,
  children,
  onClick,
  layoutId,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  layoutId: string;
}) {
  return (
    <button
      onClick={onClick}
      className="relative px-4 py-2 text-sm rounded-full"
    >
      {active && (
        <motion.span
          layoutId={layoutId}
          className="absolute inset-0 rounded-full bg-white/10 ring-1 ring-white/20"
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </button>
  );
}

/* ---------- Watchlist ---------- */
export default function Watchlist({
  onSelect,
}: {
  onSelect: (movie: Movie) => void;
}) {
  const { watchlist, toggleWatchlist } = useWatchlist();
  const { focus, setFocus, registerRail, updateRailLength } = useNavigation();

  /* ---------- Init filters ---------- */
  const [filters, setFilters] = useState<Filters>(() => {
    try {
      const stored = localStorage.getItem("watchlistFilters");
      return stored ? JSON.parse(stored) : defaultFilters;
    } catch {
      return defaultFilters;
    }
  });

  const deferredFilters = useDeferredValue(filters);

  /* ---------- Persist filters ---------- */
  useEffect(() => {
    try {
      localStorage.setItem("watchlistFilters", JSON.stringify(filters));
    } catch {}
  }, [filters]);

  /* ---------- Filter + sort ---------- */
  const filteredList = useMemo(() => {
    const list = watchlist
      .filter(
        (m) =>
          deferredFilters.type === "all" ||
          m.media_type === deferredFilters.type
      )
      .map((m) => ({
        ...m,
        _title: m.title || m.name || "",
        _date: m.release_date ? Date.parse(m.release_date) : 0,
      }));

    switch (deferredFilters.sortBy) {
      case "title-asc":
        return list.sort((a, b) => a._title.localeCompare(b._title));
      case "title-desc":
        return list.sort((a, b) => b._title.localeCompare(a._title));
      case "newest":
        return list.sort((a, b) => b._date - a._date);
      default:
        return list.sort(
          (a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0)
        );
    }
  }, [watchlist, deferredFilters]);

  /* ---------- Navigation rail ---------- */
  const [railIndex, setRailIndex] = useState<number | null>(null);

  useEffect(() => {
    if (railIndex === null) {
      setRailIndex(registerRail(filteredList.length));
    } else {
      updateRailLength(railIndex, filteredList.length);
    }
  }, [filteredList.length, railIndex, registerRail, updateRailLength]);

  /* ---------- UI ---------- */
  return (
    <motion.main
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen w-full"
    >
      <div className="pt-10 pb-6 text-center">
        <h1 className="text-4xl font-bold">Watchlist</h1>
      </div>

      <div className="sticky top-0 z-20 backdrop-blur-xl bg-black/40 border-b border-white/10 px-4 py-4">
        <div className="max-w-6xl mx-auto flex flex-wrap gap-3 justify-center">
          {SORTS.map((s) => (
            <FilterPill
              key={s.key}
              active={filters.sortBy === s.key}
              layoutId="sort-pill"
              onClick={() => setFilters((f) => ({ ...f, sortBy: s.key }))}
            >
              {s.label}
            </FilterPill>
          ))}

          <span className="w-px bg-white/10 mx-2" />

          {TYPES.map((t) => (
            <FilterPill
              key={t.key}
              active={filters.type === t.key}
              layoutId="type-pill"
              onClick={() => setFilters((f) => ({ ...f, type: t.key }))}
            >
              {t.label}
            </FilterPill>
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

      <div className="max-w-6xl mx-auto px-4 py-8">
        <motion.div
          layout
          className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-4"
        >
          <AnimatePresence mode="popLayout">
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
      </div>
    </motion.main>
  );
}
