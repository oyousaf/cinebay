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
import { ArrowLeft, ArrowUp, Bookmark, X } from "lucide-react";
import { toast } from "sonner";
import { FaPlay } from "react-icons/fa";

import type { Movie } from "@/types/movie";
import { TMDB_IMAGE, fetchDetails } from "@/lib/tmdb";
import StarringList from "./modal/StarringList";
import { useWatchlist } from "@/context/WatchlistContext";
import { useModalManager } from "@/context/ModalContext";
import { useVideoEmbed } from "@/hooks/useVideoEmbed";

/* ---------- Lazy ---------- */

const LazySimilar = lazy(() =>
  import("./modal/Recommendations").then((m) => ({ default: m.Similar }))
);

const LazyRecommendations = lazy(() =>
  import("./modal/Recommendations").then((m) => ({
    default: m.Recommendations,
  }))
);

const LazyKnownForSlider = lazy(() => import("./modal/KnownForSlider"));

/* ---------- Date helpers ---------- */

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return `${ordinal(d.getDate())} ${d.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  })}`;
};

const calculateAge = (birthday?: string, deathday?: string) => {
  if (!birthday) return null;
  const birth = new Date(birthday);
  const end = deathday ? new Date(deathday) : new Date();
  return Math.floor(
    (end.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  );
};

/* ---------- Component ---------- */

export default function Modal({
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
  const isPerson = movie.media_type === "person";
  const modalRef = useRef<HTMLDivElement>(null);

  const [mounting, setMounting] = useState(true);
  const [showFullBio, setShowFullBio] = useState(false);

  const { toggleWatchlist, isInWatchlist } = useWatchlist();
  const { openPlayer } = useModalManager();

  const embedUrl = useVideoEmbed(movie.id, movie.media_type);
  const isSaved = isInWatchlist(movie.id);

  const title = movie.title || movie.name || "Untitled";
  const poster = movie.profile_path || movie.poster_path || "";
  const displayPoster = poster ? `${TMDB_IMAGE}${poster}` : "/fallback.jpg";

  const cast = movie.credits?.cast ?? [];
  const crew = movie.credits?.crew ?? [];
  const knownFor = movie.known_for ?? [];

  const releaseDate = formatDate(movie.release_date);

  const director = useMemo(() => {
    if (movie.media_type !== "movie") return null;
    return crew.find((c) => c.job === "Director")?.name ?? null;
  }, [crew, movie.media_type]);

  const creators = useMemo(() => {
    if (movie.media_type !== "tv") return null;
    if (!movie.created_by?.length) return null;
    return movie.created_by.map((c) => c.name).join(", ");
  }, [movie.media_type, movie.created_by]);

  const MemoStarringList = useMemo(() => {
    if (isPerson || cast.length === 0) return null;
    return <StarringList cast={cast} onSelect={onSelect} />;
  }, [cast, isPerson, onSelect]);

  const handleSelectWithDetails = useCallback(
    async (item: Movie) => {
      if (!item?.id) return;
      try {
        const full = await fetchDetails(
          item.id,
          (item.media_type || movie.media_type) as "movie" | "tv" | "person"
        );
        full && onSelect?.(full);
      } catch {
        toast.error("Failed to load details.");
      }
    },
    [movie.media_type, onSelect]
  );

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounting(false));
    return () => cancelAnimationFrame(id);
  }, []);

  /* ---------- Preferred related content ---------- */

  const hasSimilar = Array.isArray(movie.similar) && movie.similar.length > 0;
  const hasRecommendations =
    Array.isArray(movie.recommendations) && movie.recommendations.length > 0;

  return (
    <AnimatePresence>
      <motion.div
        key={movie.id}
        role="dialog"
        aria-modal="true"
        aria-label={title}
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
          {/* Header */}
          <div className="absolute top-3 left-3 right-3 z-50 flex justify-between">
            {onBack ? (
              <button
                onClick={onBack}
                className="p-2 rounded-full backdrop-blur-md bg-[hsl(var(--background))]"
              >
                <ArrowLeft size={22} />
              </button>
            ) : (
              <span />
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-full backdrop-blur-md bg-[hsl(var(--background))]"
            >
              <X size={22} />
            </button>
          </div>

          {/* Content */}
          <div className="px-4 py-8 sm:p-8 bg-gradient-to-b from-black/80 via-black/60 to-black/90 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex flex-col sm:flex-row gap-6 pt-6">
              <img
                src={displayPoster}
                alt={title}
                className="w-40 sm:w-44 h-[264px] shrink-0 mx-auto sm:mx-0 rounded-lg shadow-lg object-cover"
                loading="lazy"
              />

              <div className="flex-1 space-y-4">
                <h2 className="text-3xl sm:text-4xl font-bold text-center sm:text-left">
                  {title}
                </h2>

                {!isPerson && (
                  <div className="flex flex-wrap gap-2 text-xs text-zinc-300">
                    {creators && <span>📺 {creators}</span>}
                    {director && <span>🎬 {director}</span>}
                    {releaseDate && <span>📅 {releaseDate}</span>}
                  </div>
                )}

                {!isPerson && movie.overview && (
                  <p className="text-zinc-200">{movie.overview}</p>
                )}

                {!isPerson && (
                  <div className="flex gap-4 pt-4">
                    <button
                      disabled={!embedUrl}
                      onClick={() => embedUrl && openPlayer(embedUrl)}
                      className={`px-6 py-3 rounded-full font-semibold ${
                        embedUrl
                          ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
                          : "bg-gray-600/50 text-gray-400"
                      }`}
                    >
                      {embedUrl ? <FaPlay size={22} /> : "Loading…"}
                    </button>

                    <button
                      onClick={() => toggleWatchlist(movie)}
                      className="p-3 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
                    >
                      <Bookmark size={22} />
                    </button>
                  </div>
                )}

                {MemoStarringList}
              </div>
            </div>

            <Suspense fallback={null}>
              {isPerson ? (
                knownFor.length > 0 && (
                  <LazyKnownForSlider
                    items={knownFor}
                    onSelect={handleSelectWithDetails}
                  />
                )
              ) : hasSimilar ? (
                <LazySimilar
                  items={movie.similar!}
                  onSelect={handleSelectWithDetails}
                />
              ) : hasRecommendations ? (
                <LazyRecommendations
                  items={movie.recommendations!}
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
