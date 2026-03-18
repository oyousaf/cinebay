"use client";

import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useDeferredValue,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RefreshCw } from "lucide-react";
import React from "react";

import type { Movie } from "@/types/movie";
import { TMDB_IMAGE } from "@/lib/tmdb";
import { useWatchlist } from "@/context/WatchlistContext";
import { useNavigation } from "@/context/NavigationContext";

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

const defaultFilters: Filters = { sortBy: "rating-desc", type: "all" };

/* ---------- Storage ---------- */

function readStoredFilters(): Filters {
  if (typeof window === "undefined") return defaultFilters;
  try {
    const stored = localStorage.getItem("watchlistFilters");
    return stored ? JSON.parse(stored) : defaultFilters;
  } catch {
    return defaultFilters;
  }
}

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
  const tileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isFocused) {
      tileRef.current?.focus();
    }
  }, [isFocused]);

  return (
    <motion.div
      ref={tileRef}
      layout
      tabIndex={0}
      role="button"
      aria-label={`Open ${movie.title || movie.name}`}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, x: -40, transition: { duration: 0.25 } }}
      onFocus={onFocus}
      onClick={() => onSelect(movie)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSelect(movie);
        if (e.key === "Delete") onRemove();
      }}
      className={[
        "group relative aspect-[2/2.8] rounded-xl overflow-hidden bg-black transition",
        "focus-visible:ring-4 ring-[#80ffcc]",
        isFocused
          ? "z-30 ring-4 ring-[#80ffcc] scale-[1.03]"
          : "z-10 ring-1 ring-transparent",
      ].join(" ")}
    >
      <img
        src={
          movie.poster_path
            ? `${TMDB_IMAGE}${movie.poster_path}`
            : "/fallback.jpg"
        }
        alt={movie.title || movie.name}
        loading="lazy"
        className="w-full h-full object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).src = "/fallback.jpg";
        }}
      />

      <button
        type="button"
        aria-label="Remove from watchlist"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className={[
          "pointer-events-auto absolute top-2 right-2",
          "inline-flex items-center justify-center",
          "h-9 w-9 rounded-full",
          "bg-[hsl(var(--background))]",
          "ring-1 ring-[hsl(var(--foreground)/0.25)]",
          "text-[hsl(var(--foreground))]",
          "transition hover:scale-105 active:scale-95",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#80ffcc]",
          "opacity-100 lg:opacity-0",
          "group-hover:opacity-100 group-focus-within:opacity-100",
        ].join(" ")}
      >
        <X size={18} />
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
      type="button"
      onClick={onClick}
      className="relative rounded-full px-4 py-2 text-sm xl:px-6 xl:py-3 xl:text-base hover:bg-white/5"
    >
      {active && (
        <motion.span
          layoutId={layoutId}
          className="absolute inset-0 rounded-full bg-white/10 ring-1 ring-white/20"
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

  const {
    focus,
    setFocus,
    registerRail,
    updateRailLength,
    activeTab,
    setSelectHandler,
    setPlayHandler,
    setToggleHandler,
  } = useNavigation();

  const undoRef = useRef<{ movie: Movie; ts: number } | null>(null);
  const railIndexRef = useRef<number | null>(null);

  const [filters, setFilters] = useState<Filters>(readStoredFilters);
  const deferredFilters = useDeferredValue(filters);

  /* ---------- Actions ---------- */

  const handleRemove = useCallback(
    (movie: Movie) => {
      undoRef.current = { movie, ts: Date.now() };
      toggleWatchlist(movie);
    },
    [toggleWatchlist],
  );

  /* ---------- Filtered list ---------- */

  const filteredList = useMemo(() => {
    const list = watchlist.filter(
      (m) =>
        deferredFilters.type === "all" || m.media_type === deferredFilters.type,
    );

    const getTitle = (m: Movie) => m.title || m.name || "";
    const getDate = (m: Movie) =>
      m.release_date ? Date.parse(m.release_date) : 0;

    switch (deferredFilters.sortBy) {
      case "title-asc":
        return [...list].sort((a, b) => getTitle(a).localeCompare(getTitle(b)));
      case "title-desc":
        return [...list].sort((a, b) => getTitle(b).localeCompare(getTitle(a)));
      case "newest":
        return [...list].sort((a, b) => getDate(b) - getDate(a));
      default:
        return [...list].sort(
          (a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0),
        );
    }
  }, [watchlist, deferredFilters]);

  /* ---------- Rail ---------- */

  useEffect(() => {
    if (!filteredList.length) return;

    if (railIndexRef.current === null) {
      railIndexRef.current = registerRail(filteredList.length);
    } else {
      updateRailLength(railIndexRef.current, filteredList.length);
    }
  }, [filteredList.length, registerRail, updateRailLength]);

  const railIndex = railIndexRef.current;

  /* ---------- Focus ---------- */

  const focusedMovie = useMemo(() => {
    if (activeTab !== "watchlist") return null;
    if (railIndex === null) return null;
    if (focus.section !== railIndex) return null;
    return filteredList[focus.index] ?? null;
  }, [activeTab, railIndex, focus, filteredList]);

  /* ---------- Controller mapping ---------- */

  useEffect(() => {
    if (activeTab !== "watchlist") {
      setSelectHandler(null);
      setPlayHandler(null);
      setToggleHandler(null);
      return;
    }

    setSelectHandler(() => {
      if (!focusedMovie) return;
      onSelect(focusedMovie);
    });

    setPlayHandler(() => {
      if (!focusedMovie) return;

      sessionStorage.setItem("lastFocusedTile", String(focusedMovie.id));

      if (focusedMovie.media_type === "tv") {
        window.location.href = `/watch/tv/${focusedMovie.id}/1/1`;
      } else {
        window.location.href = `/watch/movie/${focusedMovie.id}`;
      }
    });

    setToggleHandler(() => {
      if (!focusedMovie) return;
      handleRemove(focusedMovie);
    });

    return () => {
      setSelectHandler(null);
      setPlayHandler(null);
      setToggleHandler(null);
    };
  }, [
    activeTab,
    focusedMovie,
    onSelect,
    handleRemove,
    setSelectHandler,
    setPlayHandler,
    setToggleHandler,
  ]);

  /* ---------- UI ---------- */

  return (
    <motion.main className="h-screen w-full flex flex-col overflow-hidden">
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-black/40 border-b border-white/10">
        <div className="pt-10 pb-4 text-center">
          <h1 className="text-4xl font-bold">Watchlist</h1>
        </div>

        <div className="px-4 pb-4">
          <div className="max-w-7xl mx-auto flex flex-wrap gap-3 justify-center">
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
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <motion.div className="grid gap-3 grid-cols-3 md:grid-cols-5 lg:grid-cols-7">
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
                  onFocus={() => {
                    if (railIndex === null) return;
                    setFocus({ section: railIndex, index: idx });
                  }}
                  onSelect={onSelect}
                  onRemove={() => handleRemove(movie)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </motion.main>
  );
}
