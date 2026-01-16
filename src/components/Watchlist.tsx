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

type Filters = { sortBy: SortKey; type: TypeKey };

const SORTS: readonly { key: SortKey; label: string }[] = [
  { key: "rating-desc", label: "Top Rated" },
  { key: "newest", label: "Newest" },
  { key: "title-asc", label: "A–Z" },
  { key: "title-desc", label: "Z–A" },
];

const TYPES: readonly { key: TypeKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "movie", label: "Movies" },
  { key: "tv", label: "TV" },
];

const defaultFilters: Filters = { sortBy: "rating-desc", type: "all" };

/* ---------- Swipe tuning ---------- */
const MAX_REVEAL = 88;
const COMMIT_THRESHOLD = 64;
const TAP_THRESHOLD = 5;

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
  const [dragX, setDragX] = useState(0);

  const revealOpacity = Math.min(
    Math.pow(Math.abs(dragX) / MAX_REVEAL, 0.6),
    1
  );

  return (
    <motion.div
      layout
      tabIndex={0}
      onFocus={onFocus}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onSelect(movie);
        }

        if (e.key === "Delete" || e.key === "ArrowDown") {
          e.preventDefault();
          onRemove();
        }
      }}
      className={`
        group relative
        rounded-xl overflow-hidden
        focus-visible:ring-4 ring-[#80ffcc]
        ${isFocused ? "z-30" : "z-10"}
      `}
    >
      {/* Swipe reveal */}
      <div
        className="absolute inset-0 flex items-center justify-end pr-4"
        style={{
          backgroundColor: "rgb(127 29 29)",
          opacity: revealOpacity,
        }}
      >
        <span className="text-red-200 text-sm font-medium">Remove</span>
      </div>

      {/* Foreground */}
      <motion.button
        type="button"
        drag="x"
        dragElastic={0.06}
        dragConstraints={{ left: -MAX_REVEAL, right: 0 }}
        onDrag={(_, info) => setDragX(info.offset.x)}
        onDragEnd={() => {
          if (dragX < -COMMIT_THRESHOLD) {
            onRemove();
          } else if (Math.abs(dragX) < TAP_THRESHOLD) {
            onSelect(movie);
          }
          setDragX(0);
        }}
        onClick={() => {
          if (Math.abs(dragX) < TAP_THRESHOLD) {
            onSelect(movie);
          }
        }}
        style={{ x: dragX }}
        whileTap={{ scale: 0.97 }}
        className="relative w-full h-full bg-black"
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

        {/* Remove icon */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label="Remove from watchlist"
          className="
            absolute top-2 right-2
            rounded-full bg-black/60 backdrop-blur
            text-red-400 transition
            p-3 sm:p-2
            opacity-100
            sm:opacity-0 sm:group-hover:opacity-100
          "
        >
          <X size={16} />
        </button>
      </motion.button>
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

  const [filters, setFilters] = useState<Filters>(() => {
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
        if (filters.sortBy === "title-asc") return ta.localeCompare(tb);
        if (filters.sortBy === "title-desc") return tb.localeCompare(ta);
        if (filters.sortBy === "newest")
          return (
            new Date(b.release_date || "").getTime() -
            new Date(a.release_date || "").getTime()
          );
        return (b.vote_average ?? 0) - (a.vote_average ?? 0);
      });
  }, [watchlist, filters]);

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
      <div className="pt-10 pb-6 text-center">
        <h1 className="text-4xl font-bold">Watchlist</h1>
      </div>

      {/* Filters */}
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
