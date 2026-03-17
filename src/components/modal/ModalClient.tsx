"use client";

import { useEffect, useCallback, useMemo, useRef, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import type { Movie } from "@/types/movie";
import { fetchDetails, TMDB_IMAGE } from "@/lib/tmdb";

import { useNavigation } from "@/context/NavigationContext";

import ModalHeader from "./ModalHeader";
import ModalMeta from "./ModalMeta";
import ModalActions from "./ModalActions";
import ModalBody from "./ModalBody";

/* ---------- Lazy blocks ---------- */
const LazySimilar = lazy(() =>
  import("./Recommendations").then((m) => ({ default: m.Similar })),
);
const LazyRecommendations = lazy(() =>
  import("./Recommendations").then((m) => ({
    default: m.Recommendations,
  })),
);
const LazyKnownForSlider = lazy(() => import("./KnownFor"));

/* ---------- Visual tokens ---------- */
const BACKDROP =
  "bg-[radial-gradient(ellipse_at_center,hsl(var(--background)/0.25),hsl(var(--background)/0.55)_60%,hsl(var(--background)/0.75))]";

const SURFACE =
  "relative w-[95vw] max-w-4xl 2xl:max-w-6xl rounded-2xl overflow-hidden " +
  "bg-[hsl(var(--background))] ring-2 ring-[hsl(var(--foreground))] " +
  "shadow-[0_40px_120px_rgba(0,0,0,0.9)] " +
  "max-h-[calc(100dvh-2rem)] flex flex-col";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

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

  const {
    setTabNavigator,
    setModalOpen,
    setPlayHandler,
  } = useNavigation();

  const loadingRef = useRef(false);

  const isPerson = movie.media_type === "person";
  const isTV = movie.media_type === "tv";

  /* =========================
     MODAL INPUT CONTROL
  ========================= */

  useEffect(() => {
    setModalOpen(true);

    setTabNavigator((dir) => {
      if (dir === "escape") {
        if (onBack) onBack();
        else onClose();
      }
    });

    setPlayHandler(() => {
      sessionStorage.setItem("lastFocusedTile", String(movie.id));

      if (movie.media_type === "tv") {
        window.location.href = `/watch/tv/${movie.id}/1/1`;
      } else {
        window.location.href = `/watch/movie/${movie.id}`;
      }
    });

    return () => {
      setModalOpen(false);
      setTabNavigator(() => {});
      setPlayHandler(null);
    };
  }, [
    movie.id,
    movie.media_type,
    onClose,
    onBack,
    setTabNavigator,
    setModalOpen,
    setPlayHandler,
  ]);

  /* ---------- Scroll lock ---------- */

  useEffect(() => {
    document.body.classList.add("player-open");
    return () => document.body.classList.remove("player-open");
  }, []);

  /* ---------- Derived data ---------- */

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

  /* ---------- Handlers ---------- */

  const handlePersonClick = useCallback(
    async (id: number) => {
      if (!id || loadingRef.current) return;

      loadingRef.current = true;

      try {
        const full = await fetchDetails(id, "person");
        if (full) onSelect?.(full);
      } catch {
        toast.error("Failed to load person.");
      } finally {
        loadingRef.current = false;
      }
    },
    [onSelect],
  );

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

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={movie.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: EASE_OUT }}
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${BACKDROP}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          ref={modalRef}
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.98, opacity: 0 }}
          transition={{ duration: 0.25, ease: EASE_OUT }}
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
                  onPersonClick={handlePersonClick}
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
