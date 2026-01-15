"use client";

import { useState, useRef, useCallback, useEffect, memo } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { Search, Loader2 } from "lucide-react";
import debounce from "lodash.debounce";

import { fetchDetails, fetchFromProxy } from "@/lib/tmdb";
import type { Movie } from "@/types/movie";

type Props = {
  onSelectMovie: (movie: Movie) => void;
  onSelectPerson?: (person: Movie) => void;
};

function SearchBar({ onSelectMovie, onSelectPerson }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Movie[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const iconControls = useAnimation();
  const resultsRef = useRef<HTMLDivElement>(null);

  /* ================= Keyboard Isolation ================= */

  const stopWASDPropagation = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["w", "a", "s", "d", "W", "A", "S", "D"].includes(e.key)) {
      e.stopPropagation();
    }
  };

  /* ================= Loading Icon ================= */

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

  /* ================= Debounced Search ================= */

  const debouncedSearch = useRef(
    debounce(async (term: string) => {
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
    }, 300)
  ).current;

  useEffect(() => {
    debouncedSearch(query);
    return () => debouncedSearch.cancel();
  }, [query, debouncedSearch]);

  /* ================= Outside / ESC ================= */

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

  /* ================= Selection ================= */

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

  /* ================= Render ================= */

  return (
    <div className="w-full relative">
      <motion.form
        onSubmit={(e) => {
          e.preventDefault();
          debouncedSearch.flush();
        }}
        className="w-full flex items-center gap-2 rounded-xl shadow-md border px-4 py-2"
        style={{
          backgroundColor: "hsl(var(--background))",
          borderColor: "hsl(var(--foreground))",
        }}
      >
        <motion.input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDownCapture={stopWASDPropagation}
          placeholder="Search movies, shows, people..."
          className="flex-1 bg-transparent outline-none text-base md:text-lg placeholder:text-gray-500"
          style={{ color: "hsl(var(--foreground))" }}
          autoFocus
        />

        <motion.button
          type="submit"
          disabled={loading}
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.97 }}
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
            className="absolute top-full mt-2 w-full max-h-80 overflow-y-auto rounded-lg shadow-lg bg-[hsl(var(--background))] z-50 divide-y divide-[hsl(var(--foreground))]/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {results.map((item) => {
              const image =
                item.media_type === "person"
                  ? item.profile_path
                  : item.poster_path;

              const name = item.title || item.name || "Untitled";

              return (
                <div
                  key={`${item.media_type}:${item.id}`}
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
                    loading="lazy"
                    className="w-10 h-14 object-cover rounded-md"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{name}</span>
                    <span className="text-xs uppercase opacity-60">
                      {item.media_type}
                    </span>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(SearchBar);
