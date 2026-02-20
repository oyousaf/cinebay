"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Search, Loader2, Mic, MicOff } from "lucide-react";
import { FaTimes } from "react-icons/fa";

import { fetchDetails, fetchFromProxy } from "@/lib/tmdb";
import type { Movie } from "@/types/movie";

/* ---------- CONFIG ---------- */
const RECENT_KEY = "tmdb_recent_searches_v1";
const RECENT_LIMIT = 5;
const SEARCH_DELAY = 300;
const MIN_QUERY = 3;

/* ---------- STORAGE ---------- */
const readRecent = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
};

const writeRecent = (v: string[]) => {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(v));
  } catch {}
};

/* ---------- HELPERS ---------- */

const getMediaLabel = (type: Movie["media_type"]) =>
  type === "movie" ? "Movie" : type === "tv" ? "TV Show" : "Person";

const getYear = (item: Movie) => {
  const date =
    item.media_type === "movie"
      ? item.release_date
      : item.media_type === "tv"
        ? item.first_air_date
        : undefined;

  return date ? date.slice(0, 4) : null;
};

const getImage = (item: Movie) => {
  const path =
    item.media_type === "person" ? item.profile_path : item.poster_path;

  return path ? `https://image.tmdb.org/t/p/w92${path}` : "/fallback.jpg";
};

/* ---------- RELEVANCE ---------- */
const scoreResult = (item: Movie, q: string) => {
  const title = (item.title || item.name || "").toLowerCase();
  const query = q.toLowerCase();

  let score =
    title === query
      ? 100
      : title.startsWith(query)
        ? 60
        : title.includes(query)
          ? 30
          : 0;

  if (item.media_type === "movie") score += 20;
  if (item.media_type === "tv") score += 15;

  return score + (item.vote_average ?? 0) * 2;
};

/* ---------- PORTAL ROOT ---------- */
function usePortalRoot() {
  const [root, setRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let el = document.getElementById("search-portal-root");
    if (!el) {
      el = document.createElement("div");
      el.id = "search-portal-root";
      document.body.appendChild(el);
    }
    setRoot(el);
  }, []);

  return root;
}

/* ---------- COMPONENT ---------- */
function SearchBar({
  onSelectMovie,
  onSelectPerson,
}: {
  onSelectMovie: (movie: Movie) => void;
  onSelectPerson?: (person: Movie) => void;
}) {
  const portalRoot = usePortalRoot();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Movie[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [listening, setListening] = useState(false);
  const [pos, setPos] = useState<{
    left: number;
    top: number;
    width: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const requestId = useRef(0);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  /* ---------- INIT ---------- */
  useEffect(() => {
    inputRef.current?.focus();
    setRecent(readRecent().slice(0, RECENT_LIMIT));
  }, []);

  /* ---------- POSITION ---------- */
  useEffect(() => {
    if (!focused) return;

    const update = () => {
      if (!containerRef.current) return;
      const r = containerRef.current.getBoundingClientRect();

      setPos({
        left: r.left + window.scrollX,
        top: r.bottom + window.scrollY + 8,
        width: r.width,
      });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [focused]);

  /* ---------- SEARCH ---------- */
  const runSearch = useCallback(async (term: string) => {
    const q = term.trim();

    if (q.length < MIN_QUERY) {
      setResults([]);
      setLoading(false);
      return;
    }

    const id = ++requestId.current;
    setLoading(true);
    setResults([]); // prevents stale flash

    try {
      const data = await fetchFromProxy(
        `/search/multi?query=${encodeURIComponent(q)}`,
      );

      if (id !== requestId.current) return;

      setResults(
        (data?.results ?? [])
          .filter((r: Movie) => r?.id && r?.media_type)
          .sort((a: Movie, b: Movie) => scoreResult(b, q) - scoreResult(a, q))
          .slice(0, 20),
      );
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => runSearch(query), SEARCH_DELAY);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  /* ---------- RECENT ---------- */
  const saveRecent = useCallback((term: string) => {
    if (!term) return;

    setRecent((prev) => {
      const updated = [term, ...prev.filter((s) => s !== term)].slice(
        0,
        RECENT_LIMIT,
      );
      writeRecent(updated);
      return updated;
    });
  }, []);

  const clearRecent = () => {
    setRecent([]);
    writeRecent([]);
  };

  /* ---------- SELECT ---------- */
  const handleSelect = useCallback(
    async (item: Movie) => {
      const full = await fetchDetails(item.id, item.media_type);
      if (!full) return;

      item.media_type === "person"
        ? onSelectPerson?.(full)
        : onSelectMovie(full);

      saveRecent(item.title || item.name || "");
      setQuery("");
      setFocused(false);
      setResults([]);
    },
    [onSelectMovie, onSelectPerson, saveRecent],
  );

  /* ---------- VOICE ---------- */
  const startVoice = useCallback(() => {
    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!Recognition) return;

    if (!recognitionRef.current) {
      const rec = new Recognition();
      rec.lang = "en-US";
      rec.onresult = (e: SpeechRecognitionEvent) =>
        setQuery(e.results[0][0].transcript.trim());
      rec.onend = () => setListening(false);
      recognitionRef.current = rec;
    }

    setListening(true);
    recognitionRef.current.start();
  }, []);

  /* ---------- UI MODES ---------- */
  const showRecent = focused && !query && recent.length > 0;
  const showResults = focused && query.length >= MIN_QUERY;

  const variants: Variants = {
    hidden: { opacity: 0, y: -6 },
    show: { opacity: 1, y: 0, transition: { duration: 0.18 } },
  };

  /* ---------- RENDER HELPERS ---------- */

  const renderRecents = () => (
    <>
      <div className="flex justify-between items-center px-4 py-2 text-xs opacity-60">
        <span>Recent</span>
        <button onMouseDown={(e) => e.preventDefault()} onClick={clearRecent}>
          Clear
        </button>
      </div>

      <AnimatePresence initial={false}>
        {recent.map((term) => (
          <motion.div key={term} layout>
            <div
              className="px-4 py-2 hover:bg-[hsl(var(--foreground)/0.08)] cursor-pointer"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setQuery(term);
                inputRef.current?.focus();
              }}
            >
              {term}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </>
  );

  const renderResults = () => (
    <>
      {results.map((item) => (
        <div
          key={`${item.media_type}:${item.id}`}
          onClick={() => handleSelect(item)}
          className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-[hsl(var(--foreground)/0.08)]"
        >
          <img
            src={getImage(item)}
            className={
              item.media_type === "person"
                ? "w-10 h-10 rounded-full object-cover"
                : "w-10 h-14 rounded object-cover"
            }
            alt=""
          />

          <div className="min-w-0">
            <div className="text-sm font-medium truncate">
              {item.title || item.name}
            </div>

            <div className="text-xs opacity-60">
              {getMediaLabel(item.media_type)}
              {getYear(item) ? ` • ${getYear(item)}` : ""}
            </div>
          </div>
        </div>
      ))}
    </>
  );

  /* ---------- DROPDOWN ---------- */
  const dropdown =
    portalRoot && pos && focused
      ? createPortal(
          <motion.div
            variants={variants}
            initial="hidden"
            animate="show"
            style={{
              position: "absolute",
              left: pos.left,
              top: pos.top,
              width: pos.width,
              zIndex: 40,
            }}
            className="max-h-96 overflow-y-auto rounded-lg shadow-lg bg-[hsl(var(--background))] border border-[hsl(var(--foreground)/0.15)]"
          >
            {showRecent ? (
              renderRecents()
            ) : showResults ? (
              loading || results.length === 0 ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="animate-spin opacity-60" />
                </div>
              ) : (
                renderResults()
              )
            ) : null}
          </motion.div>,
          portalRoot,
        )
      : null;

  return (
    <>
      <div className="w-full flex justify-center">
        <div ref={containerRef} className="w-full max-w-3xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runSearch(query);
            }}
            className="flex items-center gap-3 px-4 py-2 rounded-xl bg-[hsl(var(--background))] border border-[hsl(var(--foreground)/0.25)] shadow-md"
          >
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 150)}
              placeholder="Search movies, shows, people…"
              className="flex-1 bg-transparent outline-none text-xl h-12"
            />

            {query && (
              <button type="button" onClick={() => setQuery("")}>
                <FaTimes />
              </button>
            )}

            <button type="button" onClick={startVoice}>
              {listening ? <MicOff /> : <Mic />}
            </button>

            <button type="submit">
              {loading ? <Loader2 className="animate-spin" /> : <Search />}
            </button>
          </form>
        </div>
      </div>

      {dropdown}
    </>
  );
}

export default memo(SearchBar);
