import { useEffect, useState, useCallback } from "react";
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

import PlayerModal from "@/components/PlayerModal";
import StarringList from "./modal/StarringList";
import KnownForSlider from "./modal/KnownForSlider";
import Recommendations from "./modal/Recommendations";
import Similar from "./modal/Similar";

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

  const title = movie.title || movie.name || "Untitled";
  const poster = movie.profile_path || movie.poster_path || "";
  const displayPoster = poster ? `${TMDB_IMAGE}${poster}` : "/fallback.jpg";
  const embedUrl = `https://vidsrc.me/embed/${movie.media_type}/${movie.id}`;

  const formatDate = (dateStr?: string) =>
    dateStr
      ? new Date(dateStr).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : null;

  const releaseDate = formatDate(movie.release_date);

  const genderLabel =
    movie.known_for_department === "Acting"
      ? movie.gender === 1
        ? "Actress"
        : "Actor"
      : movie.known_for_department;

  const calculateAge = () => {
    if (!movie.birthday) return null;
    const birth = new Date(movie.birthday);
    const death = movie.deathday ? new Date(movie.deathday) : new Date();
    let age = death.getFullYear() - birth.getFullYear();
    if (
      death < new Date(death.getFullYear(), birth.getMonth(), birth.getDate())
    ) {
      age--;
    }
    return age;
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
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
    setIsSaved(!isSaved);
  };

  const handleSelectWithDetails = async (item: Movie) => {
    const mediaType = item.media_type || movie.media_type || "movie";
    if (!item.id) return;
    try {
      const full = await fetchDetails(
        item.id,
        mediaType as "movie" | "tv" | "person"
      );
      if (full) onSelect?.(full);
    } catch (error) {
      console.error("Error fetching details:", error);
    }
  };

  const renderPersonInfo = isPerson && (
    <>
      {movie.biography && (
        <p className="text-md text-zinc-200 leading-relaxed whitespace-pre-line">
          {movie.biography.length > 600
            ? movie.biography.slice(0, 600) + "..."
            : movie.biography}
        </p>
      )}
      <div className="flex flex-wrap gap-2 sm:gap-3 text-sm sm:text-base text-zinc-300 pt-2">
        {movie.birthday && (
          <span>
            🎂 {formatDate(movie.birthday)} ({calculateAge()} yrs
            {movie.deathday ? ", deceased" : ""})
          </span>
        )}
        {movie.place_of_birth && <span>📍 {movie.place_of_birth}</span>}
        {movie.popularity && (
          <span>⭐ {movie.popularity.toFixed(1)} popularity</span>
        )}
        {genderLabel && (
          <span className="italic text-zinc-400">{genderLabel}</span>
        )}
      </div>
    </>
  );

  const renderMovieInfo = !isPerson && (
    <>
      {movie.overview && (
        <p className="text-md text-zinc-200 leading-relaxed">
          {movie.overview}
        </p>
      )}
      <div className="flex flex-wrap gap-2 sm:gap-3 text-sm sm:text-base text-zinc-300 pt-2">
        {movie.isNew && (
          <span className="bg-amber-400 text-black text-sm font-bold px-2 py-[2px] rounded shadow-[0_0_6px_#fbbf24,0_0_12px_#facc15] uppercase">
            NEW
          </span>
        )}
        {movie.genres?.length && (
          <span className="italic truncate">{movie.genres.join(", ")}</span>
        )}
        {releaseDate && <span>· {releaseDate}</span>}
        {movie.runtime && <span>· {movie.runtime} mins</span>}
        {movie.original_language && (
          <span className="capitalize">
            ·{" "}
            {new Intl.DisplayNames(["en"], { type: "language" }).of(
              movie.original_language
            )}
          </span>
        )}
        {typeof movie.vote_average === "number" && movie.vote_average > 0 && (
          <span className="bg-yellow-400 shadow-[0_0_6px_#fbbf24,0_0_12px_#facc15] text-sm text-black font-bold px-2 py-[2px] rounded">
            {movie.vote_average.toFixed(1)}
          </span>
        )}
      </div>
      {movie.credits?.cast?.length > 0 && (
        <StarringList cast={movie.credits.cast} onSelect={onSelect} />
      )}
      <div className="pt-2">
        <button
          type="button"
          className="bg-yellow-400 hover:bg-yellow-300 shadow-[0_0_6px_#fbbf24,0_0_12px_#facc15] text-black text-xl cursor-pointer uppercase font-semibold px-6 py-2 rounded-xl transition"
          onClick={() => setShowPlayer(true)}
        >
          Watch
        </button>
      </div>
    </>
  );

  const relatedContent =
    !isPerson &&
    (Array.isArray(movie.similar) && movie.similar.length > 0 ? (
      <Similar items={movie.similar} onSelect={handleSelectWithDetails} />
    ) : Array.isArray(movie.recommendations) &&
      movie.recommendations.length > 0 ? (
      <Recommendations
        items={movie.recommendations}
        onSelect={handleSelectWithDetails}
      />
    ) : null);

  return (
    <AnimatePresence>
      <motion.div
        key={movie.id}
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="relative w-[95vw] sm:w-full max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl"
        >
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="absolute top-3 left-3 z-50 text-white hover:text-yellow-400 cursor-pointer"
            >
              <ArrowLeft className="w-6 h-6 bg-black/60 rounded-full p-1" />
            </button>
          )}

          <div className="absolute top-3 right-3 z-50 flex gap-2">
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
              <X size={28} className="bg-black/60 rounded-full backdrop-blur" />
            </button>
          </div>

          <div className="relative z-10 px-4 py-6 sm:p-8 bg-gradient-to-b from-black/80 via-black/60 to-black/90 text-white max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex flex-col sm:flex-row gap-6 sm:items-start">
              <img
                src={displayPoster}
                alt={title}
                className="w-36 sm:w-44 rounded-lg shadow-lg object-cover"
                loading="lazy"
              />
              <div className="flex-1 space-y-4">
                <h2 className="text-3xl sm:text-4xl font-bold">{title}</h2>
                {renderPersonInfo}
                {renderMovieInfo}
              </div>
            </div>

            {!isPerson && relatedContent}

            {isPerson && movie.known_for?.length > 0 && (
              <KnownForSlider
                items={movie.known_for}
                onSelect={handleSelectWithDetails}
              />
            )}
          </div>

          {!isPerson && showPlayer && (
            <PlayerModal url={embedUrl} onClose={() => setShowPlayer(false)} />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
