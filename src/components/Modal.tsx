import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, ArrowLeft } from "lucide-react";

import type { Movie } from "@/types/movie";
import { TMDB_IMAGE, fetchDetails } from "@/lib/tmdb";
import {
  isInWatchlist,
  removeFromWatchlist,
  saveToWatchlist,
} from "@/lib/watchlist";

import PlayerModal from "@/components/PlayerModal";
import CastSlider from "@/components/CastSlider";

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

  const releaseDate = movie.release_date
    ? new Date(movie.release_date).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const embedUrl = `https://vidsrc.me/embed/${movie.media_type}/${movie.id}`;
  const cast = movie.credits?.cast?.slice(0, 5) || [];

  useEffect(() => {
    setIsSaved(isInWatchlist(movie.id));
  }, [movie.id]);

  const toggleWatchlist = () => {
    isSaved ? removeFromWatchlist(movie.id) : saveToWatchlist(movie);
    setIsSaved(!isSaved);
  };

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

  return (
    <AnimatePresence>
      <motion.div
        key={movie.id}
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
          {/* Content */}
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

                {isPerson && movie.biography ? (
                  <p className="text-md text-zinc-200 leading-relaxed whitespace-pre-line">
                    {movie.biography.length > 600
                      ? movie.biography.slice(0, 600) + "..."
                      : movie.biography}
                  </p>
                ) : (
                  movie.overview && (
                    <p className="text-md text-zinc-200 leading-relaxed">
                      {movie.overview}
                    </p>
                  )
                )}

                {/* Metadata */}
                <div className="flex flex-wrap gap-2 sm:gap-3 text-sm sm:text-base text-zinc-300 pt-2">
                  {!isPerson && movie.isNew && (
                    <span className="bg-amber-400 text-black text-xs font-bold p-2 rounded shadow">
                      NEW
                    </span>
                  )}
                  {!isPerson && movie.genres?.length > 0 && (
                    <span className="italic truncate">
                      {movie.genres.join(", ")}
                    </span>
                  )}
                  {releaseDate && <span>· {releaseDate}</span>}
                  {!isPerson && movie.runtime && (
                    <span>· {movie.runtime} mins</span>
                  )}
                  {!isPerson && movie.original_language && (
                    <span className="capitalize">
                      ·{" "}
                      {new Intl.DisplayNames(["en"], {
                        type: "language",
                      }).of(movie.original_language)}
                    </span>
                  )}
                  {!isPerson &&
                    typeof movie.vote_average === "number" &&
                    movie.vote_average > 0 && (
                      <span className="bg-yellow-400 text-black font-bold px-2 py-0.5 rounded shadow-sm">
                        {movie.vote_average.toFixed(1)}
                      </span>
                    )}
                  {isPerson && movie.birthday && (
                    <span>
                      🎂{" "}
                      {new Date(movie.birthday).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}{" "}
                      ({calculateAge()} yrs
                      {movie.deathday ? ", deceased" : ""})
                    </span>
                  )}
                  {isPerson && movie.place_of_birth && (
                    <span>📍 {movie.place_of_birth}</span>
                  )}
                  {isPerson && movie.popularity && (
                    <span>⭐ {movie.popularity.toFixed(1)} popularity</span>
                  )}
                  {isPerson && genderLabel && (
                    <span className="italic text-zinc-400">{genderLabel}</span>
                  )}
                </div>

                {/* Cast or Known For */}
                {!isPerson && cast.length > 0 && (
                  <div className="pt-2 text-sm text-zinc-400">
                    <span className="font-semibold text-zinc-300">
                      Starring:
                    </span>{" "}
                    {cast.map((actor, i) => (
                      <span
                        key={actor.id}
                        className="underline cursor-pointer"
                        onClick={() =>
                          fetchDetails(actor.id, "person").then(
                            (res) => res && onSelect?.(res)
                          )
                        }
                      >
                        {actor.name}
                        {i < cast.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </div>
                )}
                {isPerson &&
                  Array.isArray(movie.known_for) &&
                  movie.known_for.length > 0 && (
                    <CastSlider
                      items={movie.known_for}
                      onSelect={async (item) => {
                        if (!item.id || !item.media_type) return;
                        const full = await fetchDetails(
                          item.id,
                          item.media_type
                        );
                        if (full) onSelect?.(full);
                      }}
                    />
                  )}

                {!isPerson && (
                  <div className="pt-2">
                    <button
                      className="bg-yellow-400 hover:bg-yellow-300 text-black text-xl font-semibold px-6 py-2 rounded-xl shadow-md transition"
                      onClick={() => setShowPlayer(true)}
                    >
                      Watch
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {!isPerson && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleWatchlist}
              className={`absolute top-3 left-3 z-50 ${
                isSaved ? "text-yellow-400" : "text-white"
              } hover:text-yellow-400 bg-black/60 backdrop-blur p-2 rounded-full shadow-md cursor-pointer`}
              aria-label={
                isSaved ? "Remove from Watchlist" : "Add to Watchlist"
              }
            >
              <Heart
                size={22}
                strokeWidth={isSaved ? 3 : 2}
                fill={isSaved ? "currentColor" : "none"}
              />
            </motion.button>
          )}

          {onBack && (
            <button
              onClick={onBack}
              className="absolute top-3 left-12 z-50 text-white hover:text-yellow-400"
            >
              <ArrowLeft className="w-6 h-6 bg-black/60 rounded-full p-1" />
            </button>
          )}

          <button
            className="absolute top-3 right-3 z-50 text-white hover:text-yellow-400"
            onClick={onClose}
          >
            <X
              size={28}
              className="p-1 bg-black/60 rounded-full backdrop-blur"
            />
          </button>
        </motion.div>

        {!isPerson && showPlayer && (
          <PlayerModal url={embedUrl} onClose={() => setShowPlayer(false)} />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
