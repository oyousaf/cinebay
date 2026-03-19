"use client";

import { useEffect, useCallback, useMemo, useRef, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import type { Movie } from "@/types/movie";
import { fetchDetails, TMDB_IMAGE } from "@/lib/tmdb";

import { useNavigation } from "@/context/NavigationContext";
import { useWatchlist } from "@/context/WatchlistContext";

import ModalHeader from "./ModalHeader";
import ModalMeta from "./ModalMeta";
import ModalActions from "./ModalActions";
import ModalBody from "./ModalBody";

/* ---------- Lazy ---------- */
const LazySimilar = lazy(() =>
  import("./Recommendations").then((m) => ({ default: m.Similar })),
);
const LazyRecommendations = lazy(() =>
  import("./Recommendations").then((m) => ({
    default: m.Recommendations,
  })),
);
const LazyKnownForSlider = lazy(() => import("./KnownFor"));

const BACKDROP =
  "bg-[radial-gradient(ellipse_at_center,hsl(var(--background)/0.25),hsl(var(--background)/0.55)_60%,hsl(var(--background)/0.75))]";

const SURFACE =
  "relative w-[95vw] max-w-4xl 2xl:max-w-6xl rounded-2xl overflow-hidden " +
  "bg-[hsl(var(--background))] ring-2 ring-[hsl(var(--foreground))] " +
  "shadow-[0_40px_120px_rgba(0,0,0,0.9)] " +
  "max-h-[calc(100dvh-2rem)] flex flex-col";

export default function ModalClient({
  movie,
  onClose,
  onSelect,
  onBack,
}: {
  movie: Movie;
  onClose: () => void;
  onSelect?: (item: Movie) => void;
  onBack?: () => void;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  // 👇 gamepad edge detection
  const prevButtonsRef = useRef<Record<string, boolean>>({});

  const { setModalOpen, setPlayHandler, setSelectHandler, setToggleHandler } =
    useNavigation();

  const { toggleWatchlist } = useWatchlist();

  const isPerson = movie.media_type === "person";
  const isTV = movie.media_type === "tv";

  /* =========================
     PLAY
  ========================= */

  const handlePlay = useCallback(() => {
    sessionStorage.setItem("lastFocusedTile", String(movie.id));

    if (movie.media_type === "tv") {
      const saved = sessionStorage.getItem(`tv:${movie.id}:selection`);
      const parsed = saved ? JSON.parse(saved) : null;

      const season = parsed?.season ?? 1;
      const episode = parsed?.episode ?? 1;

      window.location.href = `/watch/tv/${movie.id}/${season}/${episode}`;
      return;
    }

    window.location.href = `/watch/movie/${movie.id}`;
  }, [movie.id, movie.media_type]);

  /* =========================
     TOGGLE WATCHLIST
  ========================= */

  const handleToggle = useCallback(() => {
    toggleWatchlist(movie);
    toast.success("Watchlist updated");
  }, [movie, toggleWatchlist]);

  /* =========================
     ESCAPE
  ========================= */

  const handleEscape = useCallback(() => {
    if (onBack) onBack();
    else onClose();
  }, [onBack, onClose]);

  /* =========================
     FOCUS OWNERSHIP
  ========================= */

  useEffect(() => {
    const el = modalRef.current;
    if (!el) return;

    el.focus(); // 👈 modal takes control
  }, []);

  const isModalActive = () => {
    return modalRef.current?.contains(document.activeElement);
  };

  /* =========================
     KEYBOARD (SCOPED)
  ========================= */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isModalActive()) return;

      const key = e.key.toLowerCase();

      if (key === "enter" || key === "p") {
        e.preventDefault();
        e.stopPropagation();
        handlePlay();
        return;
      }

      if (key === "y") {
        e.preventDefault();
        e.stopPropagation();
        handleToggle();
        return;
      }

      if (key === "escape" || key === "backspace") {
        e.preventDefault();
        e.stopPropagation();
        handleEscape();
      }
    };

    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [handlePlay, handleToggle, handleEscape]);

  /* =========================
     GAMEPAD
  ========================= */

  useEffect(() => {
    let raf: number;

    const loop = () => {
      const pad = navigator.getGamepads?.()[0];

      if (pad) {
        if (!isModalActive()) {
          raf = requestAnimationFrame(loop);
          return;
        }

        const pressed = {
          start: pad.buttons?.[9]?.pressed ?? false,
          rt: (pad.buttons?.[7]?.value ?? 0) > 0.75,
          y: pad.buttons?.[3]?.pressed ?? false,
          b: pad.buttons?.[1]?.pressed ?? false,
        };

        const prev = prevButtonsRef.current;

        if ((pressed.start || pressed.rt) && !(prev.start || prev.rt)) {
          handlePlay();
        }

        if (pressed.y && !prev.y) {
          handleToggle();
        }

        if (pressed.b && !prev.b) {
          handleEscape();
        }

        prevButtonsRef.current = pressed;
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [handlePlay, handleToggle, handleEscape]);

  /* =========================
     MODAL LIFECYCLE
  ========================= */

  useEffect(() => {
    setModalOpen(true);

    setPlayHandler(() => handlePlay);
    setSelectHandler(() => handlePlay);
    setToggleHandler(() => handleToggle);

    return () => {
      setModalOpen(false);
      setPlayHandler(null);
      setSelectHandler(null);
      setToggleHandler(null);
    };
  }, [
    handlePlay,
    handleToggle,
    setModalOpen,
    setPlayHandler,
    setSelectHandler,
    setToggleHandler,
  ]);

  /* ---------- Scroll lock ---------- */

  useEffect(() => {
    document.body.classList.add("player-open");
    return () => document.body.classList.remove("player-open");
  }, []);

  /* ---------- Derived ---------- */

  const director = useMemo(() => {
    if (movie.media_type !== "movie") return null;
    const d = movie.credits?.crew?.find((c) => c.job === "Director");
    return d ? { id: d.id, name: d.name } : null;
  }, [movie]);

  const creators = useMemo(() => {
    if (!isTV || !movie.created_by?.length) return null;
    return movie.created_by.map((c) => ({
      id: c.id,
      name: c.name,
    }));
  }, [isTV, movie]);

  const posterPath = movie.profile_path || movie.poster_path;
  const poster = posterPath ? `${TMDB_IMAGE}${posterPath}` : "/fallback.jpg";

  /* ---------- Select helpers ---------- */

  const handleSelectWithDetails = useCallback(
    async (item: Movie) => {
      if (!item?.id || loadingRef.current) return;

      loadingRef.current = true;

      try {
        const full = await fetchDetails(
          item.id,
          (item.media_type || movie.media_type) as "movie" | "tv" | "person",
        );
        if (full) onSelect?.(full);
      } catch {
        toast.error("Failed to load details.");
      } finally {
        loadingRef.current = false;
      }
    },
    [movie.media_type, onSelect],
  );

  /* =========================
     UI
  ========================= */

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={movie.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${BACKDROP}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) handleEscape();
        }}
      >
        <motion.div
          ref={modalRef}
          tabIndex={-1}
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.98, opacity: 0 }}
          className={SURFACE}
          onClick={(e) => e.stopPropagation()}
        >
          <ModalHeader onClose={onClose} onBack={onBack} />

          <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 space-y-8">
            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
              <img
                src={poster}
                alt={movie.title || movie.name}
                className="w-40 sm:w-44 h-60 sm:h-66 rounded-lg shadow-lg object-cover"
              />

              <div className="flex-1 space-y-6">
                <ModalMeta
                  movie={movie}
                  director={director}
                  creators={creators}
                />

                <ModalBody movie={movie} onSelect={onSelect} />

                {!isPerson && <ModalActions movie={movie} />}
              </div>
            </div>

            <Suspense fallback={null}>
              {isPerson ? (
                movie.known_for?.length ? (
                  <LazyKnownForSlider
                    items={movie.known_for}
                    onSelect={handleSelectWithDetails}
                  />
                ) : null
              ) : movie.similar?.length ? (
                <LazySimilar
                  items={movie.similar}
                  onSelect={handleSelectWithDetails}
                />
              ) : movie.recommendations?.length ? (
                <LazyRecommendations
                  items={movie.recommendations}
                  onSelect={handleSelectWithDetails}
                />
              ) : null}
            </Suspense>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
