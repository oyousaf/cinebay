"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { motion, useAnimation, type Variants } from "framer-motion";
import { Search, Loader2, X, Mic, MicOff } from "lucide-react";
import Snd from "snd-lib";

import { fetchDetails, fetchFromProxy } from "@/lib/tmdb";
import type { Movie } from "@/types/movie";

/* ---------- CONFIG ---------- */
const RECENT_KEY = "tmdb_recent_searches_v1";
const RECENT_LIMIT = 5;
const SEARCH_DELAY = 300;

/* ---------- HELPERS ---------- */
const isValidRecent = (s: string) => s.length >= 3 && /[a-zA-Z]/.test(s);

const readRecent = (): string[] => {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeRecent = (v: string[]) => {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(v));
  } catch {}
};

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

/* ---------- COMPONENT ---------- */
function SearchBar({
  onSelectMovie,
  onSelectPerson,
}: {
  onSelectMovie: (movie: Movie) => void;
  onSelectPerson?: (person: Movie) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [listening, setListening] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  /* ---------- Sound (lazy + non-blocking) ---------- */
  const sndRef = useRef<Snd | null>(null);

  const playSound = useCallback((sound: string) => {
    if (!sndRef.current) {
      sndRef.current = new Snd({
        easySetup: false,
        preloadSoundKit: null,
        muteOnWindowBlur: true,
      });
      sndRef.current.load(Snd.KITS.SND01).catch(() => {});
    }

    sndRef.current?.play(sound, { volume: 0.5 });
  }, []);

  /* ---------- INIT ---------- */
  useEffect(() => {
    inputRef.current?.focus();
    setRecent(readRecent().slice(0, RECENT_LIMIT));
  }, []);

  /* ---------- SEARCH ---------- */
  const runSearch = useCallback(async (term: string) => {
    const q = term.trim();
    if (q.length < 2) {
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

      const ranked = (data?.results ?? [])
        .filter((r: Movie): r is Movie => Boolean(r?.id && r?.media_type))
        .sort((a: Movie, b: Movie) => scoreResult(b, q) - scoreResult(a, q))
        .slice(0, 10);

      setResults(ranked);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  /* Native debounce */
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      runSearch(query);
    }, SEARCH_DELAY);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query, runSearch]);

  /* ---------- RECENT ---------- */
  const saveRecent = useCallback(
    (term: string) => {
      if (!isValidRecent(term)) return;

      const updated = [term, ...recent.filter((s) => s !== term)].slice(
        0,
        RECENT_LIMIT,
      );

      setRecent(updated);
      writeRecent(updated);
    },
    [recent],
  );

  const removeRecent = useCallback(
    (term: string) => {
      const updated = recent.filter((s) => s !== term);
      setRecent(updated);
      writeRecent(updated);
    },
    [recent],
  );

  const clearRecent = useCallback(() => {
    setRecent([]);
    writeRecent([]);
  }, []);

  /* ---------- SELECTION ---------- */
  const handleSelect = useCallback(
    async (item: Movie) => {
      const full = await fetchDetails(item.id, item.media_type);
      if (!full) return;

      item.media_type === "person"
        ? onSelectPerson?.(full)
        : onSelectMovie(full);

      saveRecent(query);
      setQuery("");
      setResults([]);
    },
    [onSelectMovie, onSelectPerson, query, saveRecent],
  );

  /* ---------- VOICE ---------- */
  const startVoiceSearch = useCallback(() => {
    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!Recognition) {
      playSound(Snd.SOUNDS.CAUTION);
      return;
    }

    if (!recognitionRef.current) {
      const rec = new Recognition();
      rec.lang = "en-US";

      rec.onresult = (e: SpeechRecognitionEvent) => {
        const text = e.results[0][0].transcript.trim();
        setQuery(text);
      };

      rec.onend = () => {
        setListening(false);
      };

      recognitionRef.current = rec;
    }

    setListening(true);
    playSound(Snd.SOUNDS.TRANSITION_UP);
    recognitionRef.current.start();
  }, [playSound]);

  /* ---------- UI ---------- */
  const showRecent = focused && !query && recent.length > 0;

  const listVariants: Variants = {
    hidden: { opacity: 0, y: -6 },
    show: { opacity: 1, y: 0, transition: { duration: 0.18 } },
  };

  return (
    <div className="relative w-full flex justify-center">
      <div className="relative w-full max-w-xl">
        {showRecent && (
          <div className="absolute top-full mt-2 left-0 right-0 z-50 flex flex-col items-center gap-2">
            <div className="flex flex-wrap gap-2 justify-center">
              {recent.map((term) => (
                <div
                  key={term}
                  className="flex items-center rounded-full bg-[hsl(var(--foreground)/0.08)]"
                >
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setQuery(term)}
                    className="px-3 py-1 text-sm"
                  >
                    {term}
                  </button>
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => removeRecent(term)}
                    className="px-2 opacity-60"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={clearRecent}
              className="text-xs opacity-60"
            >
              Clear recent
            </button>
          </div>
        )}

        {/* INPUT */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runSearch(query);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[hsl(var(--background))]
                     border border-[hsl(var(--foreground)/0.25)] shadow-md"
        >
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="flex-1 bg-transparent outline-none text-xl h-12"
            placeholder="Search movies, shows, people…"
          />

          {query && (
            <button type="button" onClick={() => setQuery("")}>
              <X />
            </button>
          )}

          <button type="button" onClick={startVoiceSearch}>
            {listening ? <MicOff /> : <Mic />}
          </button>

          <button type="submit">
            {loading ? <Loader2 className="animate-spin" /> : <Search />}
          </button>
        </form>

        {/* RESULTS */}
        {query.length >= 2 && results.length > 0 && (
          <motion.div
            variants={listVariants}
            initial="hidden"
            animate="show"
            className="absolute top-full mt-2 w-full max-h-80 overflow-y-auto rounded-lg shadow-lg z-50
                       bg-[hsl(var(--background))]"
          >
            {results.map((item) => (
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
                  loading="lazy"
                  alt=""
                />
                <div>
                  <div className="text-sm font-medium">
                    {item.title || item.name}
                  </div>
                  <div className="text-xs opacity-60">{item.media_type}</div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default memo(SearchBar);
