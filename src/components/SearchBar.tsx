"use client";

import { useState, useRef, useCallback, useEffect, memo } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { Search, Loader2 } from "lucide-react";
import debounce from "lodash.debounce";

import { fetchDetails, fetchFromProxy } from "@/lib/tmdb";
import type { Movie } from "@/types/movie";

import type { Variants } from "framer-motion";

type Props = {
  onSelectMovie: (movie: Movie) => void;
  onSelectPerson?: (person: Movie) => void;
};

function SearchBar({ onSelectMovie, onSelectPerson }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Movie[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);
  const iconControls = useAnimation();

  /* ---------------- Loading icon ---------------- */

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

  /* ---------------- Search logic ---------------- */

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
        `/search/multi?query=${encodeURIComponent(q)}`
      );

      const cleaned: Movie[] = (data?.results || [])
        .filter((r: Movie) => r?.id && r?.media_type)
        .slice(0, 10);

      setResults(cleaned);
      setOpen(cleaned.length > 0);
    } catch (err) {
      console.error("TMDB search failed", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedSearch = useRef(
    debounce((term: string) => runSearch(term), 300)
  ).current;

  useEffect(() => {
    debouncedSearch(query);
    return () => debouncedSearch.cancel();
  }, [query, debouncedSearch]);

  /* ---------------- Outside / ESC ---------------- */

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

  /* ---------------- Selection ---------------- */

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
    [onSelectMovie, onSelectPerson]
  );

  /* ---------------- Animations ---------------- */

  const listVariants: Variants = {
    hidden: {
      opacity: 0,
      y: -6,
    },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3, // 300ms enter
        ease: [0.16, 1, 0.3, 1], // modern ease-out
        staggerChildren: 0.04,
      },
    },
    exit: {
      opacity: 0,
      y: -4,
      transition: {
        duration: 0.2, // 200ms exit
        ease: [0.4, 0, 1, 1],
        staggerDirection: -1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 6 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.25,
        ease: [0.16, 1, 0.3, 1],
      },
    },
    exit: {
      opacity: 0,
      y: -6,
      transition: {
        duration: 0.15,
        ease: [0.4, 0, 1, 1],
      },
    },
  };

  /* ---------------- Render ---------------- */

  return (
    <div className="w-full relative">
      <motion.form
        onSubmit={(e) => {
          e.preventDefault();
          debouncedSearch.cancel();
          runSearch(query);
        }}
        className="w-full flex items-center gap-2 rounded-xl shadow-md border px-4 py-2"
        style={{
          backgroundColor: "hsl(var(--background))",
          borderColor: "hsl(var(--foreground))",
        }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search movies, shows, people..."
          className="flex-1 bg-transparent outline-none text-base md:text-lg placeholder:text-gray-500"
          style={{ color: "hsl(var(--foreground))" }}
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
              <Loader2 className="h-5 w-5" />
            </motion.span>
          ) : (
            <Search className="h-5 w-5" />
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
            className="absolute top-full mt-2 w-full max-h-80 overflow-y-auto rounded-lg shadow-lg bg-[hsl(var(--background))] z-50 divide-y divide-[hsl(var(--foreground))]/10"
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
                  className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-[hsl(var(--foreground))]/10"
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
                      {item.media_type}
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
