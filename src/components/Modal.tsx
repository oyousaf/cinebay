import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart } from "lucide-react";

import type { Movie } from "@/types/movie";
import { TMDB_IMAGE } from "@/lib/tmdb";
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
}: {
  movie: Movie;
  onClose: () => void;
}) {
  const isPerson = movie.media_type === "person";
  const [isSaved, setIsSaved] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);

  const title = movie.title || movie.name || "Untitled";
  const poster = movie.profile_path || movie.poster_path || "";
  const backdrop = movie.backdrop_path
    ? `${TMDB_IMAGE.replace("w500", "original")}${movie.backdrop_path}`
    : "/fallback.jpg";

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
    if (isSaved) {
      removeFromWatchlist(movie.id);
    } else {
      saveToWatchlist(movie);
    }
    setIsSaved(!isSaved);
  };

  const genderLabel =
    movie.known_for_department === "Acting"
      ? movie.gender === 1
        ? "Actress"
        : "Actor"
      : movie.known_for_department;

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
          {/* 🧊 Modal Content */}
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

                {/* 📝 Overview or Biography */}
                {!isPerson && movie.overview && (
                  <p className="text-md text-zinc-200 leading-relaxed">
                    {movie.overview}
                  </p>
                )}
                {isPerson && movie.biography && (
                  <p className="text-md text-zinc-200 leading-relaxed whitespace-pre-line">
                    {movie.biography.length > 600
                      ? movie.biography.slice(0, 600) + "..."
                      : movie.biography}
                  </p>
                )}

                {/* 📅 Meta Info */}
                <div className="flex flex-wrap gap-2 sm:gap-3 text-sm sm:text-base text-zinc-300 pt-2">
                  {movie.isNew && !isPerson && (
                    <span className="bg-amber-400 text-black text-xs font-bold px-2 py-0.5 rounded shadow">
                      NEW
                    </span>
                  )}
                  {movie.genres?.length > 0 && !isPerson && (
                    <span className="italic truncate">
                      {movie.genres.join(", ")}
                    </span>
                  )}
                  {releaseDate && <span>· {releaseDate}</span>}
                  {movie.runtime && !isPerson && (
                    <span>· {movie.runtime} mins</span>
                  )}
                  {movie.original_language && !isPerson && (
                    <span className="capitalize">
                      ·{" "}
                      {new Intl.DisplayNames(["en"], {
                        type: "language",
                      }).of(movie.original_language)}
                    </span>
                  )}
                  {movie.vote_average && !isPerson && (
                    <span className="bg-yellow-400 text-black font-bold px-2 py-0.5 rounded shadow-sm">
                      {movie.vote_average.toFixed(1)}
                    </span>
                  )}
                  {movie.birthday && isPerson && (
                    <span>
                      🎂{" "}
                      {new Date(movie.birthday).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  )}
                  {movie.place_of_birth && isPerson && (
                    <span>📍 {movie.place_of_birth}</span>
                  )}
                  {movie.popularity && isPerson && (
                    <span>⭐ {movie.popularity.toFixed(1)} popularity</span>
                  )}
                  {genderLabel && isPerson && (
                    <span className="italic text-zinc-400">{genderLabel}</span>
                  )}
                </div>

                {/* 🧑 Starring / Known For */}
                {!isPerson && cast.length > 0 && (
                  <div className="pt-2 text-sm text-zinc-400">
                    <span className="font-semibold text-zinc-300">
                      Starring:
                    </span>{" "}
                    {cast.map((actor, i) => (
                      <span key={actor.id}>
                        {actor.name}
                        {i < cast.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </div>
                )}
                {isPerson &&
                  Array.isArray(movie.known_for) &&
                  movie.known_for.length > 0 && (
                    <CastSlider items={movie.known_for} />
                  )}

                {/* 🎬 Watch Button */}
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

          {/* ❤️ Watchlist Toggle */}
          {!isPerson && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleWatchlist}
              className={`absolute top-3 left-3 z-50 ${
                isSaved ? "text-yellow-400" : "text-white"
              } hover:text-yellow-400 bg-black/60 backdrop-blur p-2 rounded-full shadow-md`}
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

          {/* ❌ Close */}
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

        {/* 🎞️ Player Overlay */}
        {!isPerson && showPlayer && (
          <PlayerModal url={embedUrl} onClose={() => setShowPlayer(false)} />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
