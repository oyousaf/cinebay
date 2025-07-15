import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  lazy,
  Suspense,
  useRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import type { Movie } from "@/types/movie";
import { TMDB_IMAGE, fetchDetails } from "@/lib/tmdb";
import {
  isInWatchlist,
  removeFromWatchlist,
  saveToWatchlist,
} from "@/lib/watchlist";

import StarringList from "./modal/StarringList";
import KnownForSlider from "./modal/KnownForSlider";
import Recommendations from "./modal/Recommendations";
import Similar from "./modal/Similar";
import { useVideoEmbed } from "@/hooks/useVideoEmbed";

const PlayerModal = lazy(() => import("@/components/PlayerModal"));

const formatDate = (dateStr?: string) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

const shortBio = (bio: string) =>
  bio.length > 600 ? bio.slice(0, 600) + "..." : bio;

const getAge = (birth: Date, death?: Date) => {
  const end = death ?? new Date();
  let age = end.getFullYear() - birth.getFullYear();
  if (end < new Date(end.getFullYear(), birth.getMonth(), birth.getDate())) {
    age--;
  }
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
  const [isSaved, setIsSaved] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [mounting, setMounting] = useState(true);
  const modalRef = useRef<HTMLDivElement>(null);
  const historyStack = useRef<Movie[]>([]);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const embedUrl = useVideoEmbed(
    !isPerson ? movie.id : undefined,
    !isPerson ? movie.media_type : undefined
  );

  const title = movie.title || movie.name || "Untitled";
  const poster = movie.profile_path || movie.poster_path || "";
  const displayPoster = useMemo(
    () => (poster ? `${TMDB_IMAGE}${poster}` : "/fallback.jpg"),
    [poster]
  );

  const cast = movie.credits?.cast ?? [];
  const knownFor = movie.known_for ?? [];
  const releaseDate = formatDate(movie.release_date);

  const genderLabel = useMemo(() => {
    if (movie.known_for_department === "Acting") {
      return movie.gender === 1 ? "Actress" : "Actor";
    }
    return movie.known_for_department;
  }, [movie]);

  const handleSelectWithDetails = useCallback(
    async (item: Movie) => {
      if (!item?.id) return;
      const mediaType = item.media_type || movie.media_type || "movie";
      try {
        historyStack.current.push(movie);
        const full = await fetchDetails(
          item.id,
          mediaType as "movie" | "tv" | "person"
        );
        if (full) onSelect?.(full);
      } catch (error) {
        console.error("Error fetching details:", error);
      }
    },
    [movie, onSelect]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && onBack) onBack();
      if (e.key === "ArrowRight" && movie.recommendations?.[0]) {
        handleSelectWithDetails(movie.recommendations[0]);
      }
    },
    [movie, onBack]
  );

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.changedTouches[0].clientX;
  };

  const handleTouchEnd = (e: TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    if (touchStartX.current !== null && touchEndX.current !== null) {
      const deltaX = touchEndX.current - touchStartX.current;
      if (Math.abs(deltaX) > 50) {
        if (deltaX > 0 && onBack) onBack(); // swipe right
        else if (deltaX < 0 && movie.recommendations?.[0]) {
          handleSelectWithDetails(movie.recommendations[0]); // swipe left
        }
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const trapFocus = useCallback((e: KeyboardEvent) => {
    if (e.key !== "Tab" || !modalRef.current) return;
    const focusable = modalRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    } else if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    }
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keydown", trapFocus);
    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handleTouchEnd);
    const id = requestAnimationFrame(() => setMounting(false));
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keydown", trapFocus);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
      cancelAnimationFrame(id);
    };
  }, [handleKeyDown, trapFocus]);

  useEffect(() => {
    setIsSaved(isInWatchlist(movie.id));
  }, [movie.id]);

  const toggleWatchlist = () => {
    if (isSaved) {
      removeFromWatchlist(movie.id);
      toast.error("Removed from Watchlist");
    } else {
      saveToWatchlist(movie);
      toast.success("Added to Watchlist");
    }
    setIsSaved((prev) => !prev);
  };

  return (
    <AnimatePresence>
      <motion.div
        key={movie.id}
        role="dialog"
        aria-modal="true"
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
          {/* header buttons */}
          <div className="absolute top-3 left-3 right-3 z-50 flex justify-between items-center">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="text-white hover:text-yellow-400 cursor-pointer"
              >
                <ArrowLeft className="w-6 h-6 bg-black/60 rounded-full p-1" />
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              {!isPerson && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleWatchlist}
                  type="button"
                  className={`${
                    isSaved ? "text-yellow-400" : "text-white"
                  } hover:text-yellow-400 bg-black/60 backdrop-blur p-2 rounded-full shadow-md cursor-pointer`}
                  aria-label={
                    isSaved ? "Remove from Watchlist" : "Add to Watchlist"
                  }
                >
                  <Heart
                    size={20}
                    strokeWidth={isSaved ? 3 : 2}
                    fill={isSaved ? "currentColor" : "none"}
                    className={`transition-all duration-300 ${
                      isSaved ? "drop-shadow-[0_0_6px_#fbbf24]" : ""
                    }`}
                  />
                </motion.button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="text-white hover:text-yellow-400 cursor-pointer"
              >
                <X
                  size={28}
                  className="bg-black/60 rounded-full backdrop-blur"
                />
              </button>
            </div>
          </div>

          {/* modal content */}
          <div className="relative z-10 px-4 py-8 sm:p-8 bg-gradient-to-b from-black/80 via-black/60 to-black/90 text-white max-h-[90vh] overflow-y-auto space-y-6">
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
                {isPerson ? (
                  <>
                    {movie.biography && (
                      <p className="text-md text-zinc-200 leading-relaxed whitespace-pre-line">
                        {shortBio(movie.biography)}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 sm:gap-3 text-sm sm:text-base text-zinc-300 pt-2">
                      {movie.birthday && (
                        <span>
                          🎂 {formatDate(movie.birthday)} (
                          {getAge(
                            new Date(movie.birthday),
                            movie.deathday
                              ? new Date(movie.deathday)
                              : undefined
                          )}{" "}
                          yrs{movie.deathday ? ", deceased" : ""})
                        </span>
                      )}
                      {movie.place_of_birth && (
                        <span>📍 {movie.place_of_birth}</span>
                      )}
                      {movie.popularity && (
                        <span>⭐ {movie.popularity.toFixed(1)} popularity</span>
                      )}
                      {genderLabel && (
                        <span className="italic text-zinc-400">
                          {genderLabel}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {movie.overview && (
                      <p className="text-md text-zinc-200 leading-relaxed">
                        {movie.overview}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 sm:gap-3 text-sm sm:text-base text-zinc-300 pt-2 justify-center sm:justify-start text-center sm:text-left">
                      {movie.isNew && (
                        <span className="bg-amber-400 text-black text-sm font-bold px-2 py-[2px] rounded shadow-[0_0_6px_#fbbf24,0_0_12px_#facc15] uppercase">
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
                      {movie.original_language && (
                        <span className="capitalize">
                          ·{" "}
                          {new Intl.DisplayNames(["en"], {
                            type: "language",
                          }).of(movie.original_language)}
                        </span>
                      )}
                      {typeof movie.vote_average === "number" &&
                        movie.vote_average > 0 && (
                          <span className="bg-yellow-400 shadow-[0_0_6px_#fbbf24,0_0_12px_#facc15] text-sm text-black font-bold px-2 py-[2px] rounded">
                            {movie.vote_average.toFixed(1)}
                          </span>
                        )}
                    </div>
                    {cast.length > 0 && (
                      <StarringList cast={cast} onSelect={onSelect} />
                    )}
                    <div className="pt-4 text-center sm:text-left">
                      <button
                        type="button"
                        className="bg-yellow-400 hover:bg-yellow-300 shadow-[0_0_6px_#fbbf24,0_0_12px_#facc15] text-black text-xl cursor-pointer uppercase font-semibold px-6 py-2 rounded-xl transition"
                        onClick={() => setShowPlayer(true)}
                      >
                        Watch
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
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

          {!isPerson && showPlayer && embedUrl && (
            <Suspense
              fallback={<div className="text-white p-4">Loading Player...</div>}
            >
              <PlayerModal
                url={embedUrl}
                onClose={() => setShowPlayer(false)}
              />
            </Suspense>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
