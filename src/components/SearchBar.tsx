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

/* ---------- HELPERS ---------- */

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

const getImage = (item: Movie) => {
  const path =
    item.media_type === "person" ? item.profile_path : item.poster_path;
  return path ? `https://image.tmdb.org/t/p/w92${path}` : "/fallback.jpg";
};

/* ---------- PORTAL ---------- */
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
  const [trending, setTrending] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [listening, setListening] = useState(false);
  const [mounted, setMounted] = useState(false);
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

  /* ---------- SOUND ---------- */
  const sndRef = useRef<Snd | null>(null);
  const sndReady = useRef(false);

  useEffect(() => {
    const snd = new Snd({
      easySetup: false,
      preloadSoundKit: null,
      muteOnWindowBlur: true,
    });

    snd
      .load(Snd.KITS.SND01)
      .then(() => {
        sndReady.current = true;
      })
      .catch(() => {});

    sndRef.current = snd;
  }, []);

  const playSound = useCallback((sound: string) => {
    if (!sndReady.current) return;
    sndRef.current?.play(sound, { volume: 0.5 });
  }, []);

  /* ---------- INIT ---------- */
  useEffect(() => {
    setMounted(true);
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
  }, [focused, mounted, recent.length]);

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
    if (!mounted) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), SEARCH_DELAY);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch, mounted]);

  /* ---------- TRENDING ---------- */
  useEffect(() => {
    if (!mounted) return;

    if (recent.length === 0) {
      fetchFromProxy("/trending/all/day").then((data) => {
        setTrending((data?.results ?? []).slice(0, 10));
      });
    }
  }, [recent.length, mounted]);

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

  const removeRecent = useCallback((term: string) => {
    setRecent((prev) => {
      const updated = prev.filter((t) => t !== term);
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

    if (!Recognition) {
      playSound(Snd.SOUNDS.CAUTION);
      return;
    }

    // Toggle
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      playSound(Snd.SOUNDS.TRANSITION_DOWN);
      return;
    }

    if (!recognitionRef.current) {
      const rec = new Recognition();
      rec.lang = "en-US";
      rec.interimResults = false;

      rec.onresult = (e: SpeechRecognitionEvent) => {
        const text = e.results[0][0].transcript.trim();

        setQuery(text);
        runSearch(text);
        inputRef.current?.focus();
      };

      rec.onend = () => {
        setListening(false);
        playSound(Snd.SOUNDS.TRANSITION_DOWN);
      };

      recognitionRef.current = rec;
    }

    setListening(true);
    playSound(Snd.SOUNDS.TRANSITION_UP);

    setTimeout(() => {
      recognitionRef.current?.start();
    }, 50);
  }, [listening, playSound, runSearch]);

  /* ---------- UI MODES ---------- */
  const showRecent = focused && !query && recent.length > 0;
  const showTrending =
    focused && !query && recent.length === 0 && trending.length > 0;
  const showResults = focused && query.length >= MIN_QUERY;

  const variants: Variants = {
    hidden: { opacity: 0, y: -6 },
    show: { opacity: 1, y: 0, transition: { duration: 0.18 } },
  };

  const micPulse: Variants = {
    idle: { scale: 1 },
    listening: {
      scale: [1, 1.15, 1],
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

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
            {showRecent &&
              recent.map((term) => (
                <div
                  key={term}
                  className="flex justify-between px-4 py-2 hover:bg-[hsl(var(--foreground)/0.08)]"
                >
                  <div
                    className="flex-1 cursor-pointer"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setQuery(term)}
                  >
                    {term}
                  </div>
                  <button
                    className="opacity-50 hover:opacity-100 cursor-pointer"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => removeRecent(term)}
                  >
                    <FaTimes />
                  </button>
                </div>
              ))}

            {showTrending &&
              trending.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-[hsl(var(--foreground)/0.08)]"
                >
                  <img
                    src={getImage(item)}
                    className="w-10 h-14 object-cover"
                  />
                  <div className="text-sm">{item.title || item.name}</div>
                </div>
              ))}

            {showResults &&
              (loading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="animate-spin opacity-60" />
                </div>
              ) : (
                results.map((item) => (
                  <div
                    key={`${item.media_type}:${item.id}`}
                    onClick={() => handleSelect(item)}
                    className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-[hsl(var(--foreground)/0.08)]"
                  >
                    <img
                      src={getImage(item)}
                      className="w-10 h-14 object-cover"
                    />
                    <div className="text-sm">{item.title || item.name}</div>
                  </div>
                ))
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
            className="flex items-center gap-3 px-4 py-2 rounded-xl bg-[hsl(var(--background))] border border-[hsl(var(--foreground)/0.25)] shadow-md"
          >
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 150)}
              placeholder={
                listening ? "Listening…" : "Search movies, shows, people…"
              }
              className="flex-1 bg-transparent outline-none text-xl h-12"
            />

            {query && (
              <button type="button" onClick={() => setQuery("")}>
                <FaTimes />
              </button>
            )}

            <motion.button
              type="button"
              onClick={startVoice}
              variants={micPulse}
              animate={listening ? "listening" : "idle"}
              className="relative"
            >
              {listening ? <MicOff /> : <Mic />}
            </motion.button>

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
