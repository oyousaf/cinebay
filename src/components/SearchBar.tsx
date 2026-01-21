"use client";

import { useState, useRef, useCallback, useEffect, memo } from "react";
import {
  motion,
  AnimatePresence,
  useAnimation,
  type Variants,
} from "framer-motion";
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

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const iconControls = useAnimation();

  /* ---------- Initial focus (once) ---------- */
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /* ---------- Focus recovery (theme / tab visibility) ---------- */
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    const restore = () => {
      if (document.activeElement !== el) el.focus();
    };

    window.addEventListener("visibilitychange", restore);
    return () => window.removeEventListener("visibilitychange", restore);
  }, []);

  /* ---------- Loading icon ---------- */
  useEffect(() => {
    if (!loading) {
      iconControls.stop();
      iconControls.set({ rotate: 0 });
      return;
    }

    iconControls.start({
      rotate: 360,
      transition: { repeat: Infinity, duration: 1, ease: "linear" },
    });
  }, [loading, iconControls]);

  /* ---------- Search ---------- */
  const runSearch = useCallback(async (term: string) => {
    const q = term.trim();
    if (!q) {
      setResults([]);
      setOpen(false);
      return;
    }

    setLoading(true);

    try {
      const data = await fetchFromProxy(
        `/search/multi?query=${encodeURIComponent(q)}`,
      );

      const ranked: Movie[] = (data?.results || [])
        .filter((r: Movie) => r?.id && r?.media_type)
        .filter((r: Movie) => (q.length < 3 ? r.media_type !== "person" : true))
        .sort((a: Movie, b: Movie) => scoreResult(b, q) - scoreResult(a, q))
        .slice(0, 10);

      setResults(ranked);
      setOpen(ranked.length > 0);
    } catch (err) {
      console.error("TMDB search failed", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedSearch = useRef(
    debounce((term: string) => runSearch(term), 300),
  ).current;

  useEffect(() => {
    debouncedSearch(query);
    return () => debouncedSearch.cancel();
  }, [query, debouncedSearch]);

  /* ---------- Outside click / ESC ---------- */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);

    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  /* ---------- Selection ---------- */
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
    },
    [onSelectMovie, onSelectPerson],
  );

  /* ---------- Animations ---------- */
  const listVariants: Variants = {
    hidden: { opacity: 0, y: -6 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.2, staggerChildren: 0.03 },
    },
    exit: { opacity: 0, y: -4, transition: { duration: 0.15 } },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 6 },
    show: { opacity: 1, y: 0, transition: { duration: 0.15 } },
    exit: { opacity: 0, y: -6, transition: { duration: 0.12 } },
  };

  /* -------------------------------------------------
     RENDER
  -------------------------------------------------- */
  return (
    <div className="w-full relative">
      <motion.form
        onSubmit={(e) => {
          e.preventDefault();
          debouncedSearch.cancel();
          runSearch(query);
        }}
        className="
          w-full flex items-center gap-2 px-4 py-2 rounded-xl
          bg-[hsl(var(--background))]
          border border-[hsl(var(--foreground))]
          shadow-md
        "
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search movies, shows, people..."
          className="
            flex-1 bg-transparent outline-none
            text-base md:text-lg
            text-[hsl(var(--foreground))]
            placeholder:text-[hsl(var(--foreground)/0.5)]
            caret-[hsl(var(--foreground))]
          "
        />

        <motion.button
          type="submit"
          disabled={loading}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.96 }}
          className="h-10 w-10 flex items-center justify-center rounded-full"
        >
          {loading ? (
            <motion.span animate={iconControls}>
              <Loader2 className="h-5 w-5 text-[hsl(var(--foreground))]" />
            </motion.span>
          ) : (
            <Search className="h-5 w-5 text-[hsl(var(--foreground))]" />
          )}
        </motion.button>
      </motion.form>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={resultsRef}
            variants={listVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="
              absolute top-full mt-2 w-full max-h-80 overflow-y-auto
              rounded-lg shadow-lg z-50
              bg-[hsl(var(--background))]
              divide-y divide-[hsl(var(--foreground))/0.1]
            "
          >
            {results.map((item) => {
              const image =
                item.media_type === "person"
                  ? item.profile_path
                  : item.poster_path;

              const name = item.title || item.name || "Untitled";

              return (
                <motion.div
                  key={`${item.media_type}:${item.id}`}
                  variants={itemVariants}
                  onClick={() => handleSelect(item)}
                  className="
                    flex items-center gap-3 px-4 py-2 cursor-pointer
                    hover:bg-[hsl(var(--foreground))/0.1]
                  "
                >
                  <img
                    src={
                      image
                        ? `https://image.tmdb.org/t/p/w92${image}`
                        : "/fallback.jpg"
                    }
                    alt={name}
                    className="w-10 h-14 object-cover rounded-md"
                    loading="lazy"
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
