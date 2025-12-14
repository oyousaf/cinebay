import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowUp, Bookmark, X } from "lucide-react";
import { toast } from "sonner";
import { FaPlay } from "react-icons/fa";

import type { Movie } from "@/types/movie";
import { TMDB_IMAGE, fetchDetails } from "@/lib/tmdb";
import StarringList from "./modal/StarringList";
import KnownForSlider from "./modal/KnownForSlider";
import { Recommendations, Similar } from "./modal/Recommendations";
import { useWatchlist } from "@/context/WatchlistContext";
import { useModalManager } from "@/context/ModalContext";
import { useVideoEmbed } from "@/hooks/useVideoEmbed";

/* ---------------- helpers ---------------- */

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
  const birth = new Date(birthday);
  const end = deathday ? new Date(deathday) : new Date();
  return Math.floor(
    (end.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  );
};

/* ---------------- component ---------------- */

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

  const isNew = movie.status === "new";
  const isRenewed = movie.status === "renewed";

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
          transition={{ duration: 0.3 }}
          className="relative w-[95vw] max-w-4xl rounded-2xl overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="absolute top-3 left-3 right-3 z-50 flex justify-between">
            {onBack ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onBack}
                aria-label="Go back"
                className="p-2 rounded-full backdrop-blur-md bg-[hsl(var(--background))]"
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
              className="p-2 rounded-full backdrop-blur-md bg-[hsl(var(--background))] hover:text-red-500"
            >
              <X size={22} strokeWidth={2.5} />
            </motion.button>
          </div>

          {/* Content */}
          <div className="px-4 py-8 sm:p-8 bg-gradient-to-b from-black/80 via-black/60 to-black/90 text-[#80ffcc] max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex flex-col sm:flex-row gap-6 pt-6">
              <img
                src={displayPoster}
                alt={title}
                className="w-40 sm:w-44 mx-auto sm:mx-0 rounded-lg shadow-lg object-cover"
                loading="lazy"
              />

              <div className="flex-1 space-y-4 text-center sm:text-left">
                <h2 className="text-3xl sm:text-4xl font-bold">{title}</h2>

                {/* PERSON INFO */}
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
                        <div>🎉 Age: {calculateAge(movie.birthday)} years</div>
                      )
                    )}
                    {movie.place_of_birth && (
                      <div>📍 {movie.place_of_birth}</div>
                    )}
                  </div>
                )}

                {/* BIO */}
                {movie.biography && (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowFullBio((v) => !v)}
                      className="mx-auto sm:mx-0 px-4 py-2 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] font-bold"
                    >
                      {showFullBio ? <ArrowUp size={26} /> : "BIO"}
                    </motion.button>

                    <AnimatePresence>
                      {showFullBio && (
                        <motion.p
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="text-sm text-zinc-300 bg-zinc-900/60 p-4 rounded-xl border border-zinc-700 max-h-[300px] overflow-y-auto"
                        >
                          {movie.biography}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </>
                )}

                {/* OVERVIEW */}
                {!isPerson && movie.overview && (
                  <p className="text-zinc-200">{movie.overview}</p>
                )}

                {/* META */}
                {!isPerson && (
                  <div className="flex flex-wrap gap-2 text-zinc-300 justify-center sm:justify-start">
                    {isNew && (
                      <span className="px-2 py-0.5 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] font-bold uppercase">
                        NEW
                      </span>
                    )}
                    {isRenewed && (
                      <span className="px-2 py-0.5 rounded-full bg-[hsl(var(--foreground))]/80 text-[hsl(var(--background))] font-bold uppercase">
                        RENEWED
                      </span>
                    )}
                    {movie.genres?.length > 0 && (
                      <span className="italic truncate">
                        {movie.genres.join(", ")}
                      </span>
                    )}
                    {releaseDate && <span>· {releaseDate}</span>}
                    {movie.runtime && <span>· {movie.runtime} mins</span>}
                    {movie.vote_average > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] font-bold">
                        {movie.vote_average.toFixed(1)}
                      </span>
                    )}
                  </div>
                )}

                {/* ACTIONS */}
                {!isPerson && (
                  <div className="flex gap-4 justify-center sm:justify-start pt-4">
                    <motion.button
                      disabled={!embedUrl}
                      onClick={() => embedUrl && openPlayer(embedUrl)}
                      className={`px-6 py-3 rounded-full font-semibold ${
                        embedUrl
                          ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
                          : "bg-gray-600/50 text-gray-400 cursor-not-allowed"
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

                {!isPerson && cast.length > 0 && (
                  <StarringList cast={cast} onSelect={onSelect} />
                )}
              </div>
            </div>

            {/* RELATED */}
            {isPerson ? (
              knownFor.length > 0 && (
                <KnownForSlider
                  items={knownFor}
                  onSelect={handleSelectWithDetails}
                />
              )
            ) : movie.similar?.length ? (
              <Similar
                items={movie.similar}
                onSelect={handleSelectWithDetails}
              />
            ) : movie.recommendations?.length ? (
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
