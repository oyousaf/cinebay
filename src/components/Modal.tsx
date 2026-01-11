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

/* ---------- Date helpers (ORDINAL FIX) ---------- */

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

  /* ---------- Credits ---------- */

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
              {/* Poster */}
              <img
                src={displayPoster}
                alt={title}
                className="w-40 sm:w-44 h-[264px] shrink-0 mx-auto sm:mx-0 rounded-lg shadow-lg object-cover"
                loading="lazy"
              />

              {/* Right column */}
              <div className="flex-1 space-y-4">
                <div className="space-y-4 text-center sm:text-left">
                  <h2 className="text-3xl sm:text-4xl font-bold">{title}</h2>

                  {/* META BOX */}
                  {movie.media_type !== "person" && (
                    <div
                      className="inline-flex flex-wrap items-center gap-2 px-3 py-2
    rounded-xl bg-zinc-900/60 border border-zinc-700
    text-xs text-zinc-300"
                    >
                      {creators && <span>📺 {creators}</span>}
                      {director && <span>🎬 {director}</span>}
                      {releaseDate && <span>📅 {releaseDate}</span>}

                      {movie.vote_average > 0 && (
                        <span
                          className="px-2 py-0.5 rounded-full
        bg-[hsl(var(--foreground))] text-[hsl(var(--background))] font-semibold"
                        >
                          ⭐ {movie.vote_average.toFixed(1)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* PERSON SUMMARY */}
                  {isPerson && (
                    <div className="rounded-xl bg-zinc-900/60 p-4 border border-zinc-700 text-sm text-zinc-300 space-y-1">
                      {movie.birthday && (
                        <div>🎂 Born: {formatDate(movie.birthday)}</div>
                      )}
                      {movie.deathday ? (
                        <div>
                          🕊️ Passed: {formatDate(movie.deathday)}{" "}
                          {movie.birthday &&
                            `(aged ${calculateAge(
                              movie.birthday,
                              movie.deathday
                            )})`}
                        </div>
                      ) : (
                        movie.birthday && (
                          <div>
                            🎉 Age: {calculateAge(movie.birthday)} years
                          </div>
                        )
                      )}
                      {movie.place_of_birth && (
                        <div>📍 {movie.place_of_birth}</div>
                      )}
                    </div>
                  )}

                  {/* BIO BUTTON */}
                  {isPerson && movie.biography && (
                    <div className="flex justify-center pt-2">
                      <motion.button
                        onClick={() => setShowFullBio((v) => !v)}
                        whileTap={{ scale: 0.96 }}
                        className="flex items-center gap-2 px-6 py-3 rounded-full font-semibold
                          bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-xl"
                      >
                        <AnimatePresence mode="wait" initial={false}>
                          {!showFullBio ? (
                            <motion.span
                              key="bio"
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                            >
                              BIO
                            </motion.span>
                          ) : (
                            <motion.span
                              key="up"
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                            >
                              <ArrowUp size={18} />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    </div>
                  )}
                </div>

                {/* BIO PANEL */}
                <AnimatePresence>
                  {isPerson && showFullBio && movie.biography && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 rounded-xl bg-zinc-900/60 p-4 border border-zinc-700 text-sm text-zinc-300 leading-relaxed max-h-[320px] overflow-y-auto">
                        {movie.biography}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!isPerson && movie.overview && (
                  <p className="text-zinc-200">{movie.overview}</p>
                )}

                {!isPerson && (
                  <div className="flex gap-4 justify-center sm:justify-start pt-4">
                    <motion.button
                      disabled={!embedUrl}
                      onClick={() => embedUrl && openPlayer(embedUrl)}
                      className={`px-6 py-3 rounded-full font-semibold ${
                        embedUrl
                          ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
                          : "bg-gray-600/50 text-gray-400"
                      }`}
                    >
                      {embedUrl ? <FaPlay size={22} /> : "Loading…"}
                    </motion.button>

                    <motion.button
                      onClick={() => toggleWatchlist(movie)}
                      aria-pressed={isSaved}
                      className="p-3 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
                    >
                      <Bookmark
                        size={22}
                        strokeWidth={isSaved ? 3 : 2}
                        className={
                          isSaved
                            ? "fill-[hsl(var(--background))]"
                            : "fill-none"
                        }
                      />
                    </motion.button>
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
