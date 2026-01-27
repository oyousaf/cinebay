"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { motion, useAnimation, type Variants } from "framer-motion";
import { Search, Loader2, X, Mic, MicOff } from "lucide-react";
import debounce from "lodash.debounce";
import Snd from "snd-lib";

import { fetchDetails, fetchFromProxy } from "@/lib/tmdb";
import type { Movie } from "@/types/movie";

/* -------------------------------------------------
   CONFIG
-------------------------------------------------- */
const RECENT_KEY = "tmdb_recent_searches_v1";
const RECENT_LIMIT = 5;

/* -------------------------------------------------
   TYPES
-------------------------------------------------- */
type Props = {
  onSelectMovie: (movie: Movie) => void;
  onSelectPerson?: (person: Movie) => void;
};

/* -------------------------------------------------
   HELPERS
-------------------------------------------------- */
const isValidRecent = (s: string) => s.length >= 3 && /[a-zA-Z]/.test(s);

const readRecent = (): string[] => {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((s): s is string => typeof s === "string")
      : [];
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

/* -------------------------------------------------
   COMPONENT
-------------------------------------------------- */
function SearchBar({ onSelectMovie, onSelectPerson }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [focused, setFocused] = useState(false);
  const [listening, setListening] = useState(false);
  const [, forceRender] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);
  const recent = useRef<string[]>([]);
  const searchedOnce = useRef(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // snd-lib (cached)
  const sndRef = useRef<Snd | null>(null);
  const sndReadyRef = useRef<Promise<void> | null>(null);

  const controls = useAnimation();
  const open = query.trim().length >= 2;

  const bump = () => forceRender((n) => n + 1);

  const ensureSnd = useCallback(async () => {
    if (!sndRef.current) {
      sndRef.current = new Snd({
        easySetup: false,
        preloadSoundKit: null,
        muteOnWindowBlur: true,
      });
      sndReadyRef.current = sndRef.current.load(Snd.KITS.SND01);
    }
    try {
      await sndReadyRef.current;
    } catch {}
  }, []);

  const playEarcon = useCallback(
    async (soundKey: string) => {
      await ensureSnd();
      try {
        sndRef.current?.play(soundKey, { volume: 0.5 });
      } catch {
        // ignore
      }
    },
    [ensureSnd],
  );

  /* -------------------------------------------------
     INIT
  -------------------------------------------------- */
  useEffect(() => {
    inputRef.current?.focus();
    recent.current = readRecent().slice(0, RECENT_LIMIT);
    bump();
  }, []);

  /* -------------------------------------------------
     SEARCH
  -------------------------------------------------- */
  const runSearch = useCallback(
    async (term: string) => {
      const q = term.trim();
      if (q.length < 2) return;

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
        setActiveIndex(ranked.length ? 0 : -1);
        controls.start("show");
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [controls],
  );

  const debouncedSearch = useRef(
    debounce((t: string) => runSearch(t), 300),
  ).current;

  useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch]);

  useEffect(() => {
    if (!open) {
      controls.stop();
      setResults([]);
      setActiveIndex(-1);
      setLoading(false);
      return;
    }

    if (!searchedOnce.current) {
      searchedOnce.current = true;
      runSearch(query);
    } else {
      debouncedSearch(query);
    }
  }, [query, open, runSearch, debouncedSearch, controls]);

  /* -------------------------------------------------
     VOICE SEARCH
  -------------------------------------------------- */
  const startVoiceSearch = useCallback(async () => {
    if (listening) return;

    const Recognition =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!Recognition) {
      console.warn("Speech recognition not supported");
      void playEarcon(Snd.SOUNDS.CAUTION);
      return;
    }

    if (!recognitionRef.current) {
      const rec = new Recognition();
      rec.lang = "en-US";
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      rec.onresult = (e: SpeechRecognitionEvent) => {
        const transcript = e.results[0][0].transcript.trim();
        searchedOnce.current = true;
        setQuery(transcript);
        runSearch(transcript);
      };

      rec.onerror = () => {
        setListening(false);
        void playEarcon(Snd.SOUNDS.CAUTION);
      };

      rec.onend = () => {
        setListening(false);
        void playEarcon(Snd.SOUNDS.TRANSITION_DOWN);
      };

      recognitionRef.current = rec;
    }

    setListening(true);
    await playEarcon(Snd.SOUNDS.TRANSITION_UP);
    recognitionRef.current.start();
  }, [listening, playEarcon, runSearch]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  /* -------------------------------------------------
     RECENT
  -------------------------------------------------- */
  const saveRecent = useCallback((term: string) => {
    const t = term.trim();
    if (!isValidRecent(t)) return;

    recent.current = [t, ...recent.current.filter((s) => s !== t)].slice(
      0,
      RECENT_LIMIT,
    );
    writeRecent(recent.current);
    bump();
  }, []);

  const removeRecent = useCallback((term: string) => {
    recent.current = recent.current.filter((s) => s !== term);
    writeRecent(recent.current);
    bump();
  }, []);

  const clearRecent = useCallback(() => {
    recent.current = [];
    writeRecent([]);
    bump();
  }, []);

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

      saveRecent(query);
      setQuery("");
      setResults([]);
      setActiveIndex(-1);
    },
    [onSelectMovie, onSelectPerson, query, saveRecent],
  );

  /* -------------------------------------------------
     UI
  -------------------------------------------------- */
  const hasRecent = recent.current.length > 0;
  const showRecent = focused && !open && hasRecent;

  const listVariants: Variants = {
    hidden: { opacity: 0, y: -6 },
    show: { opacity: 1, y: 0, transition: { duration: 0.18 } },
  };

  return (
    <div className="relative w-full flex justify-center">
      <div className="relative w-full max-w-xl">
        {showRecent && (
          <div className="absolute -top-14 left-0 right-0 flex flex-col items-center gap-2">
            <div className="flex flex-wrap gap-2 justify-center">
              {recent.current.map((term) => (
                <div
                  key={term}
                  className="flex items-center rounded-full overflow-hidden bg-[hsl(var(--foreground)/0.08)]"
                >
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      searchedOnce.current = true;
                      setQuery(term);
                      runSearch(term);
                    }}
                    className="px-3 py-1 text-sm hover:bg-[hsl(var(--foreground)/0.1)]"
                  >
                    {term}
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => removeRecent(term)}
                    className="px-2 py-1 opacity-60 hover:opacity-100"
                    aria-label={`Remove ${term}`}
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
              className="text-xs opacity-60 hover:opacity-100"
            >
              Clear recent
            </button>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!open) return;
            saveRecent(query);
            runSearch(query);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[hsl(var(--background))]
                     border border-[hsl(var(--foreground)/0.25)] shadow-md"
        >
          <input
            id="search"
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search movies, shows, people…"
            className="flex-1 bg-transparent outline-none text-xl h-12 leading-none text-[hsl(var(--foreground))]
                       placeholder:text-[hsl(var(--mint-green))] placeholder:opacity-50"
          />

          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear"
            >
              <X />
            </button>
          )}

          <button
            type="button"
            onClick={() => void startVoiceSearch()}
            aria-label="Voice search"
            className={listening ? "text-red-500 animate-pulse" : ""}
          >
            {listening ? <MicOff /> : <Mic />}
          </button>

          <button type="submit" aria-label="Search">
            {loading ? <Loader2 className="animate-spin" /> : <Search />}
          </button>
        </form>

        {open && results.length > 0 && (
          <motion.div
            variants={listVariants}
            initial="hidden"
            animate={controls}
            className="absolute top-full mt-2 w-full max-h-80 overflow-y-auto rounded-lg shadow-lg z-50
                       bg-[hsl(var(--background))] border border-[hsl(var(--foreground)/0.15)]"
          >
            {results.map((item, i) => {
              const active = i === activeIndex;
              const img =
                item.media_type === "person"
                  ? item.profile_path
                  : item.poster_path;

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
                      img
                        ? `https://image.tmdb.org/t/p/w92${img}`
                        : "/fallback.jpg"
                    }
                    className="w-10 h-14 rounded-md object-cover"
                    loading="lazy"
                    alt={item.title || item.name || "Untitled"}
                  />
                  <div>
                    <div className="text-sm font-medium">
                      {item.title || item.name || "Untitled"}
                    </div>
                    <div className="text-xs uppercase opacity-60">
                      {item.media_type === "tv" ? "TV Show" : item.media_type}
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default memo(SearchBar);
