// useSearchBar.ts
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

export const getSearchItemImage = (item: Movie) => {
  const path =
    item.media_type === "person" ? item.profile_path : item.poster_path;
  return path ? `https://image.tmdb.org/t/p/w92${path}` : "/fallback.jpg";
};

type Pos = { left: number; top: number; width: number };

type UseSearchBarParams = {
  onSelectMovie: (movie: Movie) => void;
  onSelectPerson?: (person: Movie) => void;
};

export function useSearchBar({
  onSelectMovie,
  onSelectPerson,
}: UseSearchBarParams) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Movie[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [trending, setTrending] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [listening, setListening] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const listeningRef = useRef(false);

  /* ---------- SOUND ---------- */
  const sndRef = useRef<Snd | null>(null);
  const sndReadyRef = useRef(false);

  useEffect(() => {
    const snd = new Snd({
      easySetup: false,
      preloadSoundKit: null,
      muteOnWindowBlur: true,
    });

    snd.load(Snd.KITS.SND01).then(() => {
      sndReadyRef.current = true;
    });

    sndRef.current = snd;

    return () => {
      try {
        // @ts-expect-error - depends on snd-lib version
        sndRef.current?.stop?.();
      } catch {}
    };
  }, []);

  const playSound = useCallback((sound: string) => {
    if (!sndReadyRef.current) return;
    sndRef.current?.play(sound, { volume: 0.5 });
  }, []);

  /* ---------- PORTAL ROOT ---------- */
  useEffect(() => {
    let el = document.getElementById("search-portal-root");
    if (!el) {
      el = document.createElement("div");
      el.id = "search-portal-root";
      document.body.appendChild(el);
    }
    setPortalRoot(el);
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
  }, [focused, mounted, recent.length, trending.length]);

  /* ---------- SEARCH ---------- */
  const runSearch = useCallback(async (term: string) => {
    const q = term.trim();
    if (q.length < MIN_QUERY) {
      setResults([]);
      setLoading(false);
      return;
    }

    const id = ++requestIdRef.current;
    setLoading(true);

    try {
      const data = await fetchFromProxy(
        `/search/multi?query=${encodeURIComponent(q)}`,
      );

      if (id !== requestIdRef.current) return;

      setResults(
        (data?.results ?? [])
          .filter((r: Movie) => r?.id && r?.media_type)
          .sort((a: Movie, b: Movie) => scoreResult(b, q) - scoreResult(a, q))
          .slice(0, 20),
      );
    } finally {
      if (id === requestIdRef.current) setLoading(false);
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
    if (recent.length === 0 && trending.length === 0) {
      fetchFromProxy("/trending/all/day").then((data) => {
        setTrending((data?.results ?? []).slice(0, 10));
      });
    }
  }, [recent.length, mounted, trending.length]);

  /* ---------- RECENT ---------- */
  const saveRecent = useCallback((term: string) => {
    const t = term.trim();
    if (!t) return;

    setRecent((prev) => {
      const updated = [t, ...prev.filter((s) => s !== t)].slice(
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

  const clearRecent = useCallback(() => {
    setRecent([]);
    writeRecent([]);
  }, []);

  /* ---------- SELECT ---------- */
  const handleSelect = useCallback(
    async (item: Movie) => {
      const full = await fetchDetails(item.id, item.media_type);
      if (!full) return;

      if (item.media_type === "person") onSelectPerson?.(full);
      else onSelectMovie(full);

      saveRecent(item.title || item.name || "");
      setQuery("");
      setResults([]);
      setFocused(false);
    },
    [onSelectMovie, onSelectPerson, saveRecent],
  );

  /* ---------- VOICE ---------- */
  const stopVoice = useCallback(() => {
    listeningRef.current = false;
    setListening(false);

    try {
      recognitionRef.current?.stop();
    } catch {}
  }, []);

  const startVoice = useCallback(() => {
    const RecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!RecognitionCtor) {
      playSound(Snd.SOUNDS.CAUTION);
      return;
    }

    if (listeningRef.current) {
      stopVoice();
      return;
    }

    if (!recognitionRef.current) {
      const rec = new RecognitionCtor();

      rec.lang = "en-US";
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      rec.onresult = (e) => {
        const text = e.results?.[0]?.[0]?.transcript?.trim?.() ?? "";
        if (!text) return;

        setQuery(text);
        runSearch(text);
        inputRef.current?.focus();
      };

      rec.onerror = () => {
        listeningRef.current = false;
        setListening(false);
        playSound(Snd.SOUNDS.CAUTION);
      };

      rec.onend = () => {
        listeningRef.current = false;
        setListening(false);
        playSound(Snd.SOUNDS.TRANSITION_DOWN);
      };

      recognitionRef.current = rec;
    }

    // Enter voice mode
    listeningRef.current = true;
    setListening(true);

    setQuery("");
    setResults([]);
    inputRef.current?.focus();

    playSound(Snd.SOUNDS.TRANSITION_UP);

    // start() can throw if called too quickly or without user gesture
    setTimeout(() => {
      try {
        recognitionRef.current?.start();
      } catch {
        listeningRef.current = false;
        setListening(false);
      }
    }, 50);
  }, [playSound, runSearch, stopVoice]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {}
    };
  }, []);

  /* ---------- UI FLAGS ---------- */
  const showRecent = useMemo(
    () => focused && !query && recent.length > 0 && !listening,
    [focused, query, recent.length, listening],
  );

  const showTrending = useMemo(
    () =>
      focused &&
      !query &&
      recent.length === 0 &&
      trending.length > 0 &&
      !listening,
    [focused, query, recent.length, trending.length, listening],
  );

  const showResults = useMemo(
    () => focused && query.length >= MIN_QUERY && !listening,
    [focused, query, listening],
  );

  /* ---------- EVENTS ---------- */
  const clearQuery = useCallback(() => setQuery(""), []);

  const submit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault?.();
      runSearch(query);
    },
    [query, runSearch],
  );

  const onBlur = useCallback(() => {
    setTimeout(() => setFocused(false), 150);
  }, []);

  const onFocus = useCallback(() => setFocused(true), []);

  return {
    // refs / mounting / portal
    mounted,
    portalRoot,
    pos,
    containerRef,
    inputRef,

    // state
    query,
    setQuery,
    results,
    recent,
    trending,
    loading,
    focused,
    listening,

    // flags
    showRecent,
    showTrending,
    showResults,

    // actions
    setFocused,
    submit,
    onFocus,
    onBlur,
    clearQuery,

    runSearch,
    handleSelect,

    saveRecent,
    removeRecent,
    clearRecent,

    startVoice,
    stopVoice,
  };
}
