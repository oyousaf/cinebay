"use client";

import { useState, useEffect, useMemo, useDeferredValue } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RefreshCw } from "lucide-react";
import React from "react";

import type { Movie } from "@/types/movie";
import { TMDB_IMAGE } from "@/lib/tmdb";
import { useWatchlist } from "@/context/WatchlistContext";
import { useNavigation } from "@/context/NavigationContext";

/* ---------- Types ---------- */

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

const FOCUS_STORAGE_KEY = "watchlist:lastFocusedId";
const FILTERS_STORAGE_KEY = "watchlistFilters";
const SCROLL_STORAGE_KEY = "watchlist:scrollTop";

const defaultFilters: Filters = { sortBy: "rating-desc", type: "all" };

function readStoredFilters(): Filters {
  if (typeof window === "undefined") return defaultFilters;

  try {
    const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
    if (!raw) return defaultFilters;

    const parsed = JSON.parse(raw);

    const sortBy: SortKey =
      parsed?.sortBy === "rating-desc" ||
      parsed?.sortBy === "newest" ||
      parsed?.sortBy === "title-asc" ||
      parsed?.sortBy === "title-desc"
        ? parsed.sortBy
        : defaultFilters.sortBy;

    const type: TypeKey =
      parsed?.type === "all" ||
      parsed?.type === "movie" ||
      parsed?.type === "tv"
        ? parsed.type
        : defaultFilters.type;

    return { sortBy, type };
  } catch {
    return defaultFilters;
  }
}

function readStoredScrollTop() {
  if (typeof window === "undefined") return 0;

  try {
    const raw = sessionStorage.getItem(SCROLL_STORAGE_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
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
  const ref = React.useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isFocused) ref.current?.focus();
  }, [isFocused]);

  return (
    <motion.div
      ref={ref}
      layout="position"
      tabIndex={0}
      role="button"
      aria-label={`Open ${movie.title || movie.name}`}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.2 }}
      onFocus={onFocus}
      onClick={() => onSelect(movie)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSelect(movie);
        if (e.key === "Delete") onRemove();
      }}
      className={[
        "group relative aspect-[2/2.8] rounded-xl overflow-hidden",
        "bg-[hsl(var(--background))]",
        "transition-transform duration-200",
        "focus-visible:ring-4 focus-visible:ring-[hsl(var(--foreground))]",
        isFocused
          ? "z-30 ring-4 ring-[hsl(var(--foreground))] scale-[1.04]"
          : "z-10 ring-1 ring-[hsl(var(--foreground)/0.15)] hover:scale-[1.02]",
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
        onError={(e) => ((e.target as HTMLImageElement).src = "/fallback.jpg")}
      />

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className={[
          "absolute top-2 right-2",
          "h-9 w-9 rounded-full",
          "flex items-center justify-center",
          "bg-[hsl(var(--background))]",
          "ring-1 ring-[hsl(var(--foreground)/0.25)]",
          "text-[hsl(var(--foreground))]",
          "transition hover:scale-105 active:scale-95",
          "focus-visible:ring-2 focus-visible:ring-[hsl(var(--foreground))]",
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

/* ---------- Main ---------- */

export default function Watchlist({
  onSelect,
}: {
  onSelect: (m: Movie) => void;
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

  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const hasRestoredScrollRef = React.useRef(false);

  const [hydrated, setHydrated] = useState(false);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const deferredFilters = useDeferredValue(filters);

  /* ---------- Hydration ---------- */

  useEffect(() => {
    setFilters(readStoredFilters());
    setHydrated(true);
  }, []);

  /* ---------- Persist Filters ---------- */

  useEffect(() => {
    if (!hydrated) return;

    try {
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
    } catch {}
  }, [filters, hydrated]);

  /* ---------- Data ---------- */

  const filteredList = useMemo(() => {
    const base = watchlist.filter(
      (m) =>
        deferredFilters.type === "all" || m.media_type === deferredFilters.type,
    );

    const title = (m: Movie) => m.title || m.name || "";
    const date = (m: Movie) =>
      m.release_date ? Date.parse(m.release_date) : 0;

    switch (deferredFilters.sortBy) {
      case "title-asc":
        return [...base].sort((a, b) => title(a).localeCompare(title(b)));
      case "title-desc":
        return [...base].sort((a, b) => title(b).localeCompare(title(a)));
      case "newest":
        return [...base].sort((a, b) => date(b) - date(a));
      default:
        return [...base].sort(
          (a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0),
        );
    }
  }, [watchlist, deferredFilters]);

  /* ---------- Rail ---------- */

  const [railIndex, setRailIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!filteredList.length) return;

    if (railIndex === null) {
      const idx = registerRail(filteredList.length);
      setRailIndex(idx);
    } else {
      updateRailLength(railIndex, filteredList.length);
    }
  }, [filteredList.length, railIndex, registerRail, updateRailLength]);

  /* ---------- Initial Focus ---------- */

  useEffect(() => {
    if (!hydrated) return;
    if (activeTab !== "watchlist") return;
    if (railIndex === null) return;
    if (!filteredList.length) return;

    const stored = sessionStorage.getItem(FOCUS_STORAGE_KEY);
    let index = 0;

    if (stored) {
      const i = filteredList.findIndex((m) => String(m.id) === stored);
      if (i >= 0) {
        index = i;
      }
    }

    setFocus({ section: railIndex, index });
  }, [hydrated, activeTab, railIndex, filteredList, setFocus]);

  /* ---------- Persist Focus ---------- */

  useEffect(() => {
    if (activeTab !== "watchlist") return;
    if (railIndex === null) return;
    if (focus.section !== railIndex) return;

    const m = filteredList[focus.index];
    if (!m) return;

    sessionStorage.setItem(FOCUS_STORAGE_KEY, String(m.id));
  }, [focus, filteredList, railIndex, activeTab]);

  /* ---------- Restore Scroll ---------- */

  useEffect(() => {
    if (!hydrated) return;
    if (hasRestoredScrollRef.current) return;
    if (!scrollRef.current) return;

    const top = readStoredScrollTop();

    requestAnimationFrame(() => {
      if (!scrollRef.current) return;
      scrollRef.current.scrollTop = top;
      hasRestoredScrollRef.current = true;
    });
  }, [hydrated]);

  /* ---------- Persist Scroll ---------- */

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      try {
        sessionStorage.setItem(SCROLL_STORAGE_KEY, String(el.scrollTop));
      } catch {}
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [hydrated]);

  /* ---------- Controls ---------- */

  const focused =
    activeTab === "watchlist" &&
    railIndex !== null &&
    focus.section === railIndex
      ? filteredList[focus.index]
      : null;

  useEffect(() => {
    if (activeTab !== "watchlist") return;

    setSelectHandler(() => focused && onSelect(focused));

    setPlayHandler(() => {
      if (!focused) return;
      window.location.href =
        focused.media_type === "tv"
          ? `/watch/tv/${focused.id}/1/1`
          : `/watch/movie/${focused.id}`;
    });

    setToggleHandler(() => {
      if (!focused) return;
      toggleWatchlist(focused);
    });

    return () => {
      setSelectHandler(null);
      setPlayHandler(null);
      setToggleHandler(null);
    };
  }, [
    activeTab,
    focused,
    onSelect,
    setPlayHandler,
    setSelectHandler,
    setToggleHandler,
    toggleWatchlist,
  ]);

  if (!hydrated) return null;

  /* ---------- UI ---------- */

  return (
    <motion.main className="h-screen w-full flex flex-col overflow-hidden">
      {/* HEADER */}
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
              aria-label="Reset filters"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* GRID */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <motion.div
            layout
            className="grid gap-3 grid-cols-3 md:grid-cols-5 lg:grid-cols-7"
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
      </div>
    </motion.main>
  );
}
