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
import { ArrowLeft, Bookmark, X } from "lucide-react";
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
import { Recommendations, Similar } from "./modal/Recommendations";
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
  onWatchlistChange,
}: {
  movie: Movie;
  onClose: () => void;
  onSelect?: (item: Movie) => void;
  onBack?: () => void;
  onWatchlistChange?: (movieId: number, isSaved: boolean) => void;
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
      if ((e.target as HTMLElement).closest(".carousel")) return;
      
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
    // 🚫 Ignore swipes inside carousels
    if ((e.target as HTMLElement).closest(".carousel")) return;
    touchEndX.current = e.changedTouches[0].clientX;
    if (touchStartX.current !== null && touchEndX.current !== null) {
      const deltaX = touchEndX.current - touchStartX.current;
      if (Math.abs(deltaX) > 50) {
        if (deltaX > 0 && onBack) onBack();
        else if (deltaX < 0 && movie.recommendations?.[0]) {
          handleSelectWithDetails(movie.recommendations[0]); // swipe left
        }
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  useEffect(() => {
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handleTouchEnd);
    const id = requestAnimationFrame(() => setMounting(false));
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
      cancelAnimationFrame(id);
    };
  }, [handleKeyDown]);

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

    const newState = !isSaved;
    setIsSaved(newState);

    onWatchlistChange?.(movie.id, newState);
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
          {/* Header Buttons */}
          <div className="absolute top-3 left-3 right-3 z-50 flex justify-between items-center">
            {onBack ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={onBack}
                aria-label="Go back"
                className="p-2 rounded-full backdrop-blur-md shadow-md bg-[hsl(var(--background))] text-[hsl(var(--foreground))] 
             transition-colors duration-200 ease-out
             hover:bg-[hsl(var(--background))]/90 
             hover:shadow-[0_0_8px_hsla(var(--foreground)/0.4)]"
              >
                <ArrowLeft size={22} strokeWidth={2.5} />
              </motion.button>
            ) : (
              <span />
            )}

            <div className="flex gap-2">
              {!isPerson && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleWatchlist}
                  type="button"
                  aria-pressed={isSaved}
                  aria-label={
                    isSaved ? "Remove from Watchlist" : "Add to Watchlist"
                  }
                  className="relative p-2 rounded-full backdrop-blur-md shadow-md 
                 bg-[hsl(var(--background))] 
                 text-[hsl(var(--foreground))] 
                 transition-colors duration-200 ease-out
                 hover:bg-[hsl(var(--background))]/90 
                 hover:shadow-[0_0_8px_hsla(var(--foreground)/0.4)]"
                >
                  <motion.div
                    animate={{
                      scale: isSaved ? 1.15 : 1,
                      color: "hsl(var(--foreground))",
                      textShadow: isSaved
                        ? "0px 0px 6px hsla(var(--foreground)/0.6)"
                        : "0px 0px 0px transparent",
                    }}
                    transition={{ type: "spring", stiffness: 250, damping: 18 }}
                  >
                    <Bookmark
                      size={22}
                      strokeWidth={isSaved ? 3 : 2}
                      className={
                        isSaved ? "fill-[hsl(var(--foreground))]" : "fill-none"
                      }
                    />
                  </motion.div>
                </motion.button>
              )}

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="p-2 rounded-full backdrop-blur-md shadow-md 
               bg-[hsl(var(--background))] 
               text-[hsl(var(--foreground))] 
               transition-colors duration-200 ease-out
               hover:text-red-500 hover:bg-[hsl(var(--background))]/90 
               hover:shadow-[0_0_8px_#ef4444]"
              >
                <X size={22} strokeWidth={2.5} />
              </motion.button>
            </div>
          </div>

          {/* Modal Content */}
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
                        <span className="bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-xs md:text-sm font-bold px-2 py-[2px] rounded-full uppercase shadow-pulse">
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
                          <span className="bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-xs md:text-sm font-semibold px-2 py-[2px] rounded-full shadow-[0_0_6px_hsl(var(--foreground)/0.6),0_0_12px_hsl(var(--foreground)/0.4)]">
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
                        className="bg-[hsl(var(--foreground))] hover:bg-[hsl(var(--foreground))]/90 text-[hsl(var(--background))] text-xl cursor-pointer uppercase font-semibold px-6 py-2 rounded-full transition shadow-[0_0_6px_hsl(var(--foreground)/0.6),0_0_12px_hsl(var(--foreground)/0.4)]"
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
