"use client";

import { useState, useRef, useCallback, useEffect, memo } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Search, Loader2 } from "lucide-react";
import debounce from "lodash.debounce";

import { fetchDetails, fetchFromProxy } from "@/lib/tmdb";
import type { Movie } from "@/types/movie";

/* -------------------------------------------------
   TYPES
-------------------------------------------------- */
type Props = {
  onSelectMovie: (movie: Movie) => void;
  onSelectPerson?: (person: Movie) => void;
};

/* -------------------------------------------------
   RANKING
-------------------------------------------------- */
function scoreResult(item: Movie, query: string): number {
  const q = query.toLowerCase();
  const title = (item.title || item.name || "").toLowerCase();

  let score = 0;
  if (title === q) score += 100;
  else if (title.startsWith(q)) score += 60;
  else if (title.includes(q)) score += 30;

  if (item.media_type === "movie") score += 20;
  if (item.media_type === "tv") score += 15;
  if (item.media_type === "person") score += 5;

  score += (item.vote_average ?? 0) * 2;
  return score;
}

/* -------------------------------------------------
   COMPONENT
-------------------------------------------------- */
function SearchBar({ onSelectMovie, onSelectPerson }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Movie[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);

  /* ---------- Initial focus ---------- */
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /* -------------------------------------------------
     SEARCH (RACE-SAFE)
  -------------------------------------------------- */
  const runSearch = useCallback(async (term: string) => {
    const q = term.trim();
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    const id = ++requestId.current;
    setLoading(true);

    try {
      const data = await fetchFromProxy(
        `/search/multi?query=${encodeURIComponent(q)}`,
      );

      if (id !== requestId.current) return;

      const ranked: Movie[] = (data?.results || [])
        .filter((r: Movie) => r?.id && r?.media_type)
        .filter((r: Movie) => (q.length < 3 ? r.media_type !== "person" : true))
        .sort((a: Movie, b: Movie) => scoreResult(b, q) - scoreResult(a, q))
        .slice(0, 10);

      setResults(ranked);
      setOpen(ranked.length > 0);
      setActiveIndex(ranked.length ? 0 : -1);
    } catch {
      setResults([]);
      setOpen(false);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  const debouncedSearch = useRef(
    debounce((term: string) => runSearch(term), 300),
  ).current;

  useEffect(() => {
    debouncedSearch(query);
    return () => debouncedSearch.cancel();
  }, [query, debouncedSearch]);

  /* -------------------------------------------------
     KEYBOARD (LOCAL, CONTROLLED)
  -------------------------------------------------- */
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      }

      if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        handleSelect(results[activeIndex]);
      }

      if (e.key === "Escape") {
        setOpen(false);
        setActiveIndex(-1);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, results, activeIndex]);

  /* -------------------------------------------------
     SCROLL ACTIVE INTO VIEW
  -------------------------------------------------- */
  useEffect(() => {
    if (!resultsRef.current || activeIndex < 0) return;
    const el = resultsRef.current.children[activeIndex] as HTMLElement;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  /* -------------------------------------------------
     OUTSIDE CLICK
  -------------------------------------------------- */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  /* -------------------------------------------------
     SELECTION
  -------------------------------------------------- */
  const handleSelect = useCallback(
    async (item: Movie) => {
      const full = await fetchDetails(item.id, item.media_type);
      if (!full) return;

      if (item.media_type === "person") {
        onSelectPerson?.(full);
      } else {
        onSelectMovie(full);
      }

      setOpen(false);
      setActiveIndex(-1);
    },
    [onSelectMovie, onSelectPerson],
  );

  /* -------------------------------------------------
     ANIMATION
  -------------------------------------------------- */
  const listVariants: Variants = {
    hidden: { opacity: 0, y: -6 },
    show: { opacity: 1, y: 0, transition: { staggerChildren: 0.03 } },
    exit: { opacity: 0, y: -4 },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 6 },
    show: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -6 },
  };

  /* -------------------------------------------------
     RENDER
  -------------------------------------------------- */
  return (
    <div className="relative w-full overflow-visible">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          debouncedSearch.cancel();
          runSearch(query);
        }}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[hsl(var(--background))] border border-[hsl(var(--foreground)/0.25)] shadow-md"
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search movies, shows, people…"
          className="flex-1 bg-transparent outline-none text-base text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--foreground)/0.5)]"
        />

        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-[hsl(var(--foreground))]" />
        ) : (
          <Search className="h-5 w-5 text-[hsl(var(--foreground))]" />
        )}
      </form>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={resultsRef}
            variants={listVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="absolute top-full mt-2 w-full max-h-80 overflow-y-auto rounded-lg shadow-lg z-50 bg-[hsl(var(--background))] border border-[hsl(var(--foreground)/0.15)]"
          >
            {results.map((item, i) => {
              const active = i === activeIndex;
              const image =
                item.media_type === "person"
                  ? item.profile_path
                  : item.poster_path;
              const name = item.title || item.name || "Untitled";

              return (
                <motion.div
                  key={`${item.media_type}:${item.id}`}
                  variants={itemVariants}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => handleSelect(item)}
                  className={`flex items-center gap-3 px-4 py-2 cursor-pointer ${
                    active
                      ? "bg-[hsl(var(--foreground)/0.15)]"
                      : "hover:bg-[hsl(var(--foreground)/0.08)]"
                  }`}
                >
                  <img
                    src={
                      image
                        ? `https://image.tmdb.org/t/p/w92${image}`
                        : "/fallback.jpg"
                    }
                    className="w-10 h-14 object-cover rounded-md"
                    loading="lazy"
                    alt={name}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{name}</span>
                    <span className="text-xs uppercase opacity-60">
                      {item.media_type === "tv" ? "TV Show" : item.media_type}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(SearchBar);
