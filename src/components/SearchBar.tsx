"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Search, Loader2, Mic, MicOff } from "lucide-react";
import { FaTimes } from "react-icons/fa";
import Snd from "snd-lib";

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

/* ---------- SCORE ---------- */
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
  const [trending, setTrending] = useState<Movie[]>([]);
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
  const sndRef = useRef<Snd | null>(null);

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

    const t = setTimeout(update, 260);

    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [focused]);

  /* ---------- TRENDING ---------- */
  useEffect(() => {
    fetchFromProxy("/trending/all/day")
      .then((d) => setTrending((d?.results ?? []).slice(0, 8)))
      .catch(() => {});
  }, []);

  /* ---------- SOUND ---------- */
  const playSound = useCallback((s: string) => {
    if (!sndRef.current) {
      sndRef.current = new Snd({ easySetup: false });
      sndRef.current.load(Snd.KITS.SND01).catch(() => {});
    }
    sndRef.current.play(s, { volume: 0.5 });
  }, []);

  /* ---------- SEARCH ---------- */
  const runSearch = useCallback(async (term: string) => {
    const q = term.trim();
    if (q.length < MIN_QUERY) {
      setResults([]);
      return;
    }

    const id = ++requestId.current;
    setLoading(true);

    try {
      const data = await fetchFromProxy(
        `/search/multi?query=${encodeURIComponent(q)}`,
      );

      if (id !== requestId.current) return;

      setResults(
        (data?.results ?? [])
          .filter((r: Movie) => r?.id && r?.media_type)
          .sort((a: Movie, b: Movie) => scoreResult(b, q) - scoreResult(a, q))
          .slice(0, 10),
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
  const saveRecent = useCallback(
    (term: string) => {
      if (term.length < MIN_QUERY) return;
      const updated = [term, ...recent.filter((s) => s !== term)].slice(
        0,
        RECENT_LIMIT,
      );
      setRecent(updated);
      writeRecent(updated);
    },
    [recent],
  );

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

      saveRecent(query);
      setQuery("");
      setFocused(false);
      setResults([]);
    },
    [onSelectMovie, onSelectPerson, query, saveRecent],
  );

  /* ---------- VOICE ---------- */
  const startVoice = useCallback(() => {
    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!Recognition) {
      playSound(Snd.SOUNDS.CAUTION);
      return;
    }

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
  }, [playSound]);

  /* ---------- FLAGS ---------- */
  const showRecent = focused && !query && recent.length > 0;
  const showTrending = focused && !query && recent.length === 0;
  const showResults = focused && query.length >= MIN_QUERY;

  const variants: Variants = {
    hidden: { opacity: 0, y: -6 },
    show: { opacity: 1, y: 0, transition: { duration: 0.18 } },
  };

  /* ---------- PORTAL ---------- */
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
            className="max-h-80 overflow-y-auto rounded-lg shadow-lg bg-[hsl(var(--background))]
            border border-[hsl(var(--foreground)/0.15)]"
          >
            {/* RECENT */}
            {showRecent && (
              <>
                <div className="flex justify-between items-center px-4 py-2 text-xs opacity-60">
                  <span>Recent</span>

                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={clearRecent}
                    className="p-1 rounded opacity-60 hover:opacity-100 hover:bg-[hsl(var(--foreground)/0.08)]
                     transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                </div>

                <AnimatePresence initial={false}>
                  {recent.map((term) => (
                    <motion.div
                      key={term}
                      layout
                      initial={{ opacity: 0, y: -4, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{
                        opacity: 0,
                        y: -6,
                        scale: 0.96,
                        height: 0,
                        transition: { duration: 0.18, ease: "easeOut" },
                      }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div
                        className="flex items-center justify-between px-4 py-2 hover:bg-[hsl(var(--foreground)/0.08)]
                        cursor-pointer"
                      >
                        {/* Select term */}
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setQuery(term)}
                          className="flex-1 text-left cursor-pointer"
                        >
                          {term}
                        </button>

                        {/* Remove single */}
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setRecent((prev) => {
                              const updated = prev.filter((s) => s !== term);
                              writeRecent(updated);
                              return updated;
                            });
                          }}
                          className="ml-3 p-1 rounded opacity-60 hover:opacity-100 hover:bg-[hsl(var(--foreground)/0.08)]
                          transition-colors cursor-pointer"
                        >
                          <FaTimes size={12} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </>
            )}

            {/* TRENDING */}
            {showTrending && (
              <>
                <div className="px-4 py-2 text-xs opacity-60">Trending</div>
                {trending.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className="px-4 py-2 cursor-pointer hover:bg-[hsl(var(--foreground)/0.08)]"
                  >
                    {item.title || item.name}
                  </div>
                ))}
              </>
            )}

            {/* RESULTS */}
            {showResults &&
              (loading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="animate-spin opacity-60" />
                </div>
              ) : results.length > 0 ? (
                results.map((item) => (
                  <div
                    key={`${item.media_type}:${item.id}`}
                    onClick={() => handleSelect(item)}
                    className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-[hsl(var(--foreground)/0.08)]"
                  >
                    <img
                      src={
                        item.poster_path
                          ? `https://image.tmdb.org/t/p/w92${item.poster_path}`
                          : "/fallback.jpg"
                      }
                      className="w-10 h-14 object-cover"
                      alt=""
                    />
                    <div>
                      <div className="text-sm font-medium">
                        {item.title || item.name}
                      </div>
                      <div className="text-xs opacity-60">
                        {item.media_type}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-6 text-center opacity-60">
                  No matches found
                </div>
              ))}
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
            className="flex items-center gap-3 px-4 py-2 rounded-xl bg-[hsl(var(--background))]
             border border-[hsl(var(--foreground)/0.25)] shadow-md"
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
