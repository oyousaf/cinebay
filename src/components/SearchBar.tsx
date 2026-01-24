"use client";

import { useState, useRef, useCallback, useEffect, memo } from "react";
import { motion, useAnimation, type Variants } from "framer-motion";
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
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);

  const controls = useAnimation();

  // intent-based visibility (never async)
  const open = query.trim().length >= 2;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /* -------------------------------------------------
     SEARCH (RACE SAFE)
  -------------------------------------------------- */
  const runSearch = useCallback(async (term: string) => {
    const q = term.trim();
    if (q.length < 2) {
      setResults([]);
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
        .sort((a: Movie, b: Movie) => scoreResult(b, q) - scoreResult(a, q))
        .slice(0, 10);

      setResults(ranked);
      setActiveIndex(ranked.length ? 0 : -1);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  /* -------------------------------------------------
     DEBOUNCE → ANIMATION TRIGGER
  -------------------------------------------------- */
  const debouncedSearch = useRef(
    debounce(async (term: string) => {
      await runSearch(term);
      controls.start("show"); // animate only after pause
    }, 300),
  ).current;

  useEffect(() => {
    if (!open) return;
    controls.set("hidden");
    debouncedSearch(query);
  }, [query, open, debouncedSearch, controls]);

  useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch]);

  /* -------------------------------------------------
     SELECTION
  -------------------------------------------------- */
  const handleSelect = useCallback(
    async (item: Movie) => {
      const full = await fetchDetails(item.id, item.media_type);
      if (!full) return;

      item.media_type === "person"
        ? onSelectPerson?.(full)
        : onSelectMovie(full);

      setResults([]);
      setActiveIndex(-1);
    },
    [onSelectMovie, onSelectPerson],
  );

  /* -------------------------------------------------
     ANIMATION
  -------------------------------------------------- */
  const listVariants: Variants = {
    hidden: { opacity: 0, y: -8 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.25, ease: "easeOut" },
    },
  };

  /* -------------------------------------------------
     RENDER
  -------------------------------------------------- */
  return (
    <div className="relative w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!query.trim()) return;
          runSearch(query);
        }}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[hsl(var(--background))]
                   border border-[hsl(var(--foreground)/0.25)] shadow-md"
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search movies, shows, people…"
          className="flex-1 bg-transparent outline-none text-base text-[hsl(var(--foreground))]
             placeholder:text-[hsl(var(--foreground)/0.5)]"
        />

        {loading ? <Loader2 className="animate-spin" /> : <Search />}
      </form>

      {open && (
        <motion.div
          ref={resultsRef}
          variants={listVariants}
          initial="hidden"
          animate={controls}
          className="absolute top-full mt-2 w-full max-h-80 overflow-y-auto rounded-lg shadow-lg z-50
                     bg-[hsl(var(--background))] border border-[hsl(var(--foreground)/0.15)]"
        >
          {results.map((item, i) => {
            const active = i === activeIndex;

            const image =
              item.media_type === "person"
                ? item.profile_path
                : item.poster_path;

            const name = item.title || item.name || "Untitled";

            return (
              <div
                key={`${item.media_type}:${item.id}`}
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
              </div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

export default memo(SearchBar);
