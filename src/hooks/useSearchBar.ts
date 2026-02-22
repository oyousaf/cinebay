"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Snd from "snd-lib";

import { fetchDetails, fetchFromProxy, fetchTrendingClean } from "@/lib/tmdb";
import type { Movie } from "@/types/movie";

/* ---------- CONFIG ---------- */
const RECENT_KEY = "tmdb_recent_searches_v1";
const RECENT_LIMIT = 5;
const SEARCH_DELAY = 300;
const MIN_QUERY = 3;

const TAB_ANIM_MS = 280;
const SETTLE_MS = 360;

/* ---------- STORAGE ---------- */
const readRecent = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
};

const writeRecent = (v: string[]) => {
  if (typeof window === "undefined") return;
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
  isModalOpen?: boolean;
};

export function useSearchBar({
  onSelectMovie,
  onSelectPerson,
  isModalOpen = false,
}: UseSearchBarParams) {
  /* ---------- STATE ---------- */
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

  /* ---------- REFS ---------- */
  const containerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const settleRafRef = useRef<number | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const listeningRef = useRef(false);

  const sndRef = useRef<Snd | null>(null);
  const sndReadyRef = useRef(false);

  const prevModalOpenRef = useRef(isModalOpen);

  /* ---------- SOUND ---------- */
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
        // @ts-ignore
        snd.stop?.();
      } catch {}
    };
  }, []);

  const playSound = useCallback((sound: string) => {
    if (sndReadyRef.current) {
      sndRef.current?.play(sound, { volume: 0.5 });
    }
  }, []);

  /* ---------- PORTAL ROOT ---------- */
  useEffect(() => {
    if (typeof document === "undefined") return;

    let el = document.getElementById("search-portal-root");
    if (!el) {
      el = document.createElement("div");
      el.id = "search-portal-root";
      document.body.appendChild(el);
    }
    setPortalRoot(el);
  }, []);

  /* ---------- MODAL SYNC ---------- */
  useEffect(() => {
    const wasOpen = prevModalOpenRef.current;
    prevModalOpenRef.current = isModalOpen;

    // Modal opened → close dropdown + stop voice
    if (isModalOpen) {
      setFocused(false);
      setListening(false);
      listeningRef.current = false;

      try {
        recognitionRef.current?.stop();
      } catch {}

      requestIdRef.current++;

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      return;
    }

    // Modal just closed → restore focus + dropdown
    if (wasOpen && !isModalOpen) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        setFocused(true);
        computePos();
        settleMeasure();
      });
    }
  }, [isModalOpen]);

  /* ---------- INIT ---------- */
  useEffect(() => {
    setMounted(true);
    setRecent(readRecent().slice(0, RECENT_LIMIT));

    const t = setTimeout(() => {
      inputRef.current?.focus();
    }, TAB_ANIM_MS);

    return () => clearTimeout(t);
  }, []);

  /* ---------- POSITION ---------- */
  const computePos = useCallback(() => {
    const anchor = formRef.current ?? containerRef.current;
    if (!anchor) return;

    const r = anchor.getBoundingClientRect();
    setPos((prev) => {
      if (
        prev &&
        prev.left === r.left &&
        prev.top === r.bottom + 8 &&
        prev.width === r.width
      )
        return prev;
      return { left: r.left, top: r.bottom + 8, width: r.width };
    });
  }, []);

  const settleMeasure = useCallback(
    (ms = SETTLE_MS) => {
      const start = performance.now();

      const tick = () => {
        computePos();
        if (performance.now() - start < ms) {
          settleRafRef.current = requestAnimationFrame(tick);
        }
      };

      if (settleRafRef.current) cancelAnimationFrame(settleRafRef.current);
      settleRafRef.current = requestAnimationFrame(tick);
    },
    [computePos],
  );

  useEffect(() => {
    return () => {
      if (settleRafRef.current) cancelAnimationFrame(settleRafRef.current);
    };
  }, []);

  useLayoutEffect(() => {
    if (!focused || isModalOpen) return;

    computePos();
    settleMeasure();

    const onResize = () => settleMeasure();
    const onScroll = () => computePos();

    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);

    const vv = window.visualViewport;
    vv?.addEventListener("resize", onResize);
    vv?.addEventListener("scroll", onScroll);

    const ro = new ResizeObserver(() => settleMeasure());
    const anchor = formRef.current ?? containerRef.current;
    if (anchor) ro.observe(anchor);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
      vv?.removeEventListener("resize", onResize);
      vv?.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [focused, isModalOpen, computePos, settleMeasure]);

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

      const cleaned =
        data?.results
          ?.filter((r: Movie) => r?.id && r?.media_type)
          .sort((a: Movie, b: Movie) => scoreResult(b, q) - scoreResult(a, q))
          .slice(0, 20) ?? [];

      setResults(cleaned);
    } finally {
      if (id === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      runSearch(query);
    }, SEARCH_DELAY);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch, mounted]);

  /* ---------- TRENDING ---------- */
  useEffect(() => {
    if (!mounted) return;
    if (recent.length === 0 && trending.length === 0) {
      fetchTrendingClean().then(setTrending);
    }
  }, [recent.length, trending.length, mounted]);

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
      saveRecent(item.title || item.name || "");
      setFocused(false);

      const full = await fetchDetails(item.id, item.media_type);
      if (!full) return;

      if (item.media_type === "person") onSelectPerson?.(full);
      else onSelectMovie(full);
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
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

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

      rec.onresult = (e: SpeechRecognitionEvent) => {
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

    listeningRef.current = true;
    setListening(true);

    setQuery("");
    setResults([]);
    inputRef.current?.focus();

    playSound(Snd.SOUNDS.TRANSITION_UP);

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

  /* ---------- FLAGS ---------- */
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
    if (isModalOpen) return;
    setTimeout(() => setFocused(false), 150);
  }, [isModalOpen]);

  const onFocus = useCallback(() => {
    setFocused(true);
    computePos();
    settleMeasure();
  }, [computePos, settleMeasure]);

  return {
    mounted,
    portalRoot,
    pos,

    containerRef,
    formRef,
    inputRef,

    query,
    setQuery,
    results,
    recent,
    trending,
    loading,
    focused,
    listening,

    showRecent,
    showTrending,
    showResults,

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
