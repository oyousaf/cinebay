"use client";

import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  lazy,
  Suspense,
} from "react";
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
  import("./Recommendations").then((m) => ({ default: m.Similar }))
);
const LazyRecommendations = lazy(() =>
  import("./Recommendations").then((m) => ({ default: m.Recommendations }))
);
const LazyKnownForSlider = lazy(() => import("./KnownForSlider"));

/* ---------- Component ---------- */

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
  const [mounting, setMounting] = useState(true);

  const isPerson = movie.media_type === "person";
  const isTV = movie.media_type === "tv";

  /* ---------- Derived meta ---------- */

  const director = useMemo(() => {
    if (movie.media_type !== "movie") return null;
    return (
      movie.credits?.crew?.find((c) => c.job === "Director")?.name ?? null
    );
  }, [movie.media_type, movie.credits]);

  const creators = useMemo(() => {
    if (!isTV || !movie.created_by?.length) return null;
    return movie.created_by.map((c) => c.name).join(", ");
  }, [isTV, movie.created_by]);

  const posterPath = movie.profile_path || movie.poster_path;
  const poster = posterPath
    ? `${TMDB_IMAGE}${posterPath}`
    : "/fallback.jpg";

  /* ---------- Selection ---------- */

  const handleSelectWithDetails = useCallback(
    async (item: Movie) => {
      if (!item?.id) return;
      try {
        const full = await fetchDetails(
          item.id,
          (item.media_type || movie.media_type) as
            | "movie"
            | "tv"
            | "person"
        );
        if (full) onSelect?.(full);
      } catch {
        toast.error("Failed to load details.");
      }
    },
    [movie.media_type, onSelect]
  );

  /* ---------- Mount sync ---------- */

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounting(false));
    return () => cancelAnimationFrame(id);
  }, []);

  /* ---------- Render ---------- */

  return (
    <AnimatePresence>
      <motion.div
        key={movie.id}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm ${
          mounting ? "pointer-events-none" : ""
        }`}
      >
        <motion.div
          ref={modalRef}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="relative w-[95vw] max-w-4xl rounded-2xl overflow-hidden shadow-2xl"
        >
          <ModalHeader onClose={onClose} onBack={onBack} />

          {/* CONTENT */}
          <div className="px-4 py-8 sm:p-8 bg-gradient-to-b from-black/80 via-black/60 to-black/90 max-h-[90vh] overflow-y-auto space-y-8">
            {/* HERO ROW */}
            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
              <img
                src={poster}
                alt={movie.title || movie.name}
                className="w-40 sm:w-44 h-[264px] rounded-lg shadow-lg object-cover mx-auto sm:mx-0"
              />

              <div className="flex-1 space-y-6 text-center sm:text-left">
                <ModalMeta
                  movie={movie}
                  director={director}
                  creators={creators}
                />

                <ModalBody movie={movie} onSelect={onSelect} />

                <ModalActions movie={movie} />
              </div>
            </div>

            {/* RECOMMENDATIONS */}
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
