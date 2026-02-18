"use client";

import { useEffect, useCallback, useMemo, useRef, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import type { Movie } from "@/types/movie";
import { fetchDetails, TMDB_IMAGE } from "@/lib/tmdb";

import ModalHeader from "./ModalHeader";
import ModalMeta from "./ModalMeta";
import ModalActions from "./ModalActions";
import ModalBody from "./ModalBody";

/* ---------- Lazy blocks ---------- */
const LazySimilar = lazy(() =>
  import("./Recommendations").then((m) => ({ default: m.Similar })),
);
const LazyRecommendations = lazy(() =>
  import("./Recommendations").then((m) => ({ default: m.Recommendations })),
);
const LazyKnownForSlider = lazy(() => import("./KnownFor"));

/* ---------- Visual tokens ---------- */
const BACKDROP =
  "bg-[radial-gradient(ellipse_at_center,hsl(var(--background)/0.25),hsl(var(--background)/0.55)_60%,hsl(var(--background)/0.75))]";

/* Viewport-safe surface */
const SURFACE =
  "relative w-[95vw] max-w-4xl 2xl:max-w-6xl rounded-2xl overflow-hidden " +
  "bg-[hsl(var(--background))] ring-2 ring-[hsl(var(--foreground))] " +
  "shadow-[0_40px_120px_rgba(0,0,0,0.9)] " +
  "max-h-[calc(100dvh-2rem)] flex flex-col";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/* -------------------------------------------------
   COMPONENT
-------------------------------------------------- */
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

  const isPerson = movie.media_type === "person";
  const isTV = movie.media_type === "tv";

  /* ---------- Body scroll lock ---------- */
  useEffect(() => {
    document.body.classList.add("player-open");
    return () => {
      document.body.classList.remove("player-open");
    };
  }, []);

  /* ---------- Escape to close ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* ---------- Derived meta ---------- */
  const director = useMemo(() => {
    if (movie.media_type !== "movie") return null;
    return movie.credits?.crew?.find((c) => c.job === "Director")?.name ?? null;
  }, [movie]);

  const creators = useMemo(() => {
    if (!isTV || !movie.created_by?.length) return null;
    return movie.created_by.map((c) => c.name).join(", ");
  }, [isTV, movie]);

  const posterPath = movie.profile_path || movie.poster_path;
  const poster = posterPath ? `${TMDB_IMAGE}${posterPath}` : "/fallback.jpg";

  /* ---------- Selection ---------- */
  const handleSelectWithDetails = useCallback(
    async (item: Movie) => {
      if (!item?.id) return;
      try {
        const full = await fetchDetails(
          item.id,
          (item.media_type || movie.media_type) as "movie" | "tv" | "person",
        );
        if (full) onSelect?.(full);
      } catch {
        toast.error("Failed to load details.");
      }
    },
    [movie.media_type, onSelect],
  );

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={movie.id}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: EASE_OUT }}
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${BACKDROP}`}
        onClick={onClose}
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

          {/* Scrollable content area */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8 2xl:px-12 2xl:py-10 space-y-8 2xl:space-y-10">
            {/* HERO */}
            <div className="flex flex-col sm:flex-row gap-6 2xl:gap-10 items-center sm:items-start">
              <img
                src={poster}
                alt={movie.title || movie.name}
                className="w-40 sm:w-44 2xl:w-64 h-60 sm:h-66 2xl:h-96 rounded-lg shadow-lg object-cover"
                loading="eager"
              />

              <div
                className={`flex-1 text-center sm:text-left ${
                  isPerson ? "space-y-4" : "space-y-6"
                }`}
              >
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
