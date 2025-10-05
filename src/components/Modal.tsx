import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowUp, Bookmark, X } from "lucide-react";
import { toast } from "sonner";

import type { Movie } from "@/types/movie";
import { TMDB_IMAGE, fetchDetails } from "@/lib/tmdb";
import StarringList from "./modal/StarringList";
import KnownForSlider from "./modal/KnownForSlider";
import { Recommendations, Similar } from "./modal/Recommendations";
import { FaPlay } from "react-icons/fa";
import { useWatchlist } from "@/context/WatchlistContext";
import { useModalManager } from "@/context/ModalContext";
import { useVideoEmbed } from "@/hooks/useVideoEmbed";

const formatDate = (dateStr?: string) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

const calculateAge = (birthday?: string, deathday?: string) => {
  if (!birthday) return null;
  const birthDate = new Date(birthday);
  const endDate = deathday ? new Date(deathday) : new Date();
  const age = Math.floor(
    (endDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  );
  return age;
};

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
  const [mounting, setMounting] = useState(true);
  const modalRef = useRef<HTMLDivElement>(null);

  const { toggleWatchlist, isInWatchlist } = useWatchlist();
  const { openPlayer } = useModalManager();
  const isSaved = isInWatchlist(movie.id);

  const embedUrl = useVideoEmbed(movie.id, movie.media_type);
  const title = movie.title || movie.name || "Untitled";
  const poster = movie.profile_path || movie.poster_path || "";
  const displayPoster = useMemo(
    () => (poster ? `${TMDB_IMAGE}${poster}` : "/fallback.jpg"),
    [poster]
  );

  const cast = movie.credits?.cast ?? [];
  const knownFor = movie.known_for ?? [];
  const releaseDate = formatDate(movie.release_date);
  const [showFullBio, setShowFullBio] = useState(false);

  const handleSelectWithDetails = useCallback(
    async (item: Movie) => {
      if (!item?.id) return;
      const mediaType = item.media_type || movie.media_type || "movie";
      try {
        const full = await fetchDetails(
          item.id,
          mediaType as "movie" | "tv" | "person"
        );
        if (full) onSelect?.(full);
      } catch (error) {
        console.error("Error fetching details:", error);
        toast.error("Failed to load details.");
      }
    },
    [movie, onSelect]
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
          transition={{ duration: 0.3 }}
          className="relative w-[95vw] sm:w-full max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="absolute top-3 left-3 right-3 z-50 flex justify-between items-center">
            {onBack ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onBack}
                aria-label="Go back"
                className="p-2 rounded-full backdrop-blur-md shadow-md bg-[hsl(var(--background))] text-[hsl(var(--foreground))] hover:shadow-[0_0_8px_hsla(var(--foreground)/0.4)]"
              >
                <ArrowLeft size={22} strokeWidth={2.5} />
              </motion.button>
            ) : (
              <span />
            )}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              aria-label="Close modal"
              className="p-2 rounded-full backdrop-blur-md shadow-md bg-[hsl(var(--background))] text-[hsl(var(--foreground))] hover:text-red-500 hover:shadow-[0_0_8px_#ef4444]"
            >
              <X size={22} strokeWidth={2.5} />
            </motion.button>
          </div>

          {/* Content */}
          <div className="relative z-10 px-4 py-8 sm:p-8 bg-gradient-to-b from-black/80 via-black/60 to-black/90 text-[#80ffcc] max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex flex-col sm:flex-row gap-6 sm:items-start pt-6 sm:pt-0">
              <div className="flex justify-center sm:block">
                <img
                  src={displayPoster}
                  alt={title}
                  className="w-40 sm:w-44 rounded-lg shadow-lg object-cover"
                  loading="lazy"
                />
              </div>
              <div className="flex-1 space-y-4 mt-4 sm:mt-0 text-center sm:text-left">
                <h2 className="text-3xl sm:text-4xl font-bold">{title}</h2>

                {/* Person Info */}
                {isPerson && (
                  <div className="mt-4 w-full rounded-xl bg-zinc-900/60 p-4 shadow-md border border-zinc-700">
                    <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">
                      Personal Info
                    </h3>
                    <div className="flex flex-col gap-2 text-sm text-zinc-300">
                      {movie.birthday && (
                        <span>
                          🎂 <strong>Born:</strong> {formatDate(movie.birthday)}
                        </span>
                      )}
                      {movie.deathday ? (
                        <span>
                          🕊️ <strong>Passed:</strong>{" "}
                          {formatDate(movie.deathday)}{" "}
                          {movie.birthday &&
                            `(aged ${calculateAge(
                              movie.birthday,
                              movie.deathday
                            )})`}
                        </span>
                      ) : (
                        movie.birthday && (
                          <span>
                            🎉 <strong>Age:</strong>{" "}
                            {calculateAge(movie.birthday)} years
                          </span>
                        )
                      )}
                      {movie.place_of_birth && (
                        <span>
                          📍 <strong>Place of Birth:</strong>{" "}
                          {movie.place_of_birth}
                        </span>
                      )}
                      {typeof movie.popularity === "number" && (
                        <span>
                          ⭐ <strong>Popularity:</strong>{" "}
                          {movie.popularity.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Biography Toggle */}
                {movie.biography && (
                  <div className="mt-6 flex flex-col items-center justify-center text-center">
                    <motion.button
                      whileHover={{ scale: 1.07 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setShowFullBio((prev) => !prev)}
                      className="flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))]
                      font-semibold text-xl uppercase transition duration-300 ease-out"
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={showFullBio ? "arrow" : "bio"}
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                          className="flex items-center justify-center"
                        >
                          {showFullBio ? (
                            <ArrowUp size={28} strokeWidth={3} />
                          ) : (
                            "BIO"
                          )}
                        </motion.span>
                      </AnimatePresence>
                    </motion.button>

                    <AnimatePresence>
                      {showFullBio && (
                        <motion.div
                          key="bio"
                          initial={{ opacity: 0, y: -12, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -12, scale: 0.98 }}
                          transition={{
                            duration: 0.3,
                            ease: [0.45, 0, 0.25, 1],
                          }}
                          className="relative w-full max-w-2xl mt-4"
                        >
                          <p
                            className="max-h-[300px] overflow-y-auto text-sm sm:text-base text-zinc-300 leading-relaxed bg-zinc-900/60 p-4 rounded-xl border border-zinc-700
                            scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent"
                          >
                            {movie.biography}
                          </p>
                          <div
                            className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-zinc-900/80 via-zinc-900/40 to-transparent
                            pointer-events-none rounded-b-xl"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Overview */}
                {!isPerson && movie.overview && (
                  <p className="text-md text-zinc-200 leading-relaxed">
                    {movie.overview}
                  </p>
                )}

                {/* Meta row */}
                {!isPerson && (
                  <div className="flex flex-wrap gap-2 sm:gap-3 text-sm sm:text-base text-zinc-300 pt-2 justify-center sm:justify-start items-center">
                    {movie.isNew && (
                      <span className="bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-md font-bold px-2 py-0.5 rounded-full uppercase shadow-pulse">
                        NEW
                      </span>
                    )}
                    {movie.genres?.length && (
                      <span className="italic truncate">
                        {movie.genres.join(", ")}
                      </span>
                    )}
                    {releaseDate && <span>· {releaseDate}</span>}
                    {movie.runtime && <span>· {movie.runtime} mins</span>}

                    {/* ⭐ Rating */}
                    {typeof movie.vote_average === "number" &&
                      movie.vote_average > 0 && (
                        <span className="bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-md font-bold px-2 py-0.5 rounded-full uppercase">
                          {movie.vote_average.toFixed(1)}
                        </span>
                      )}
                  </div>
                )}

                {/* Actions */}
                {!isPerson && (
                  <div className="pt-4 flex gap-4 justify-center sm:justify-start">
                    <motion.button
                      whileHover={{ scale: embedUrl ? 1.05 : 1 }}
                      whileTap={{ scale: embedUrl ? 0.95 : 1 }}
                      disabled={!embedUrl}
                      type="button"
                      onClick={() => embedUrl && openPlayer(embedUrl)}
                      className={`flex items-center justify-center gap-2 px-6 py-3 rounded-full transition 
                        text-[clamp(1rem,1.2vw+0.5rem,1.25rem)] font-semibold
                        ${
                          embedUrl
                            ? "bg-[hsl(var(--foreground))] hover:bg-[hsl(var(--foreground))]/90 text-[hsl(var(--background))] shadow-[0_0_6px_hsl(var(--foreground)/0.6),0_0_12px_hsl(var(--foreground)/0.4)]"
                            : "bg-gray-600/50 text-gray-400 cursor-not-allowed"
                        }`}
                    >
                      {!embedUrl ? (
                        <>
                          <svg
                            className="animate-spin h-5 w-5 text-gray-300"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8v4l3.5-3.5L12 0v4a8 8 0 00-8 8h4z"
                            />
                          </svg>
                          <span className="text-sm">Loading…</span>
                        </>
                      ) : (
                        <FaPlay size={24} />
                      )}
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleWatchlist(movie)}
                      aria-pressed={isSaved}
                      aria-label={
                        isSaved ? "Remove from Watchlist" : "Add to Watchlist"
                      }
                      className="bg-[hsl(var(--foreground))] hover:bg-[hsl(var(--foreground))]/90 
                      text-[hsl(var(--background))] cursor-pointer 
                      font-semibold p-3 rounded-full transition shadow-md"
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

                {!isPerson && cast.length > 0 && (
                  <StarringList cast={cast} onSelect={onSelect} />
                )}
              </div>
            </div>

            {/* Related */}
            {isPerson ? (
              knownFor.length > 0 && (
                <KnownForSlider
                  items={knownFor}
                  onSelect={handleSelectWithDetails}
                />
              )
            ) : Array.isArray(movie.similar) && movie.similar.length > 0 ? (
              <Similar
                items={movie.similar}
                onSelect={handleSelectWithDetails}
              />
            ) : Array.isArray(movie.recommendations) &&
              movie.recommendations.length > 0 ? (
              <Recommendations
                items={movie.recommendations}
                onSelect={handleSelectWithDetails}
              />
            ) : null}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
