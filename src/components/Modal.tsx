import { motion, AnimatePresence } from "framer-motion";
import { X, Heart } from "lucide-react";
import type { Movie } from "@/types/movie";
import { TMDB_IMAGE } from "@/lib/tmdb";

import { useEffect, useState } from "react";
import {
  saveToWatchlist,
  removeFromWatchlist,
  isInWatchlist,
} from "@/lib/watchlist";

import { toast } from "sonner";

export default function Modal({
  movie,
  onClose,
}: {
  movie: Movie;
  onClose: () => void;
}) {
  const backdrop = movie.backdrop_path
    ? `${TMDB_IMAGE.replace("w500", "original")}${movie.backdrop_path}`
    : "/fallback.jpg";

  const poster =
    movie.media_type === "person"
      ? movie.profile_path
        ? `${TMDB_IMAGE}${movie.profile_path}`
        : "/fallback.jpg"
      : movie.poster_path
      ? `${TMDB_IMAGE}${movie.poster_path}`
      : "/fallback.jpg";

  const title = movie.title || movie.name || "Untitled";

  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setIsSaved(isInWatchlist(movie.id));
  }, [movie.id]);

  const handleToggleWatchlist = () => {
    if (isSaved) {
      removeFromWatchlist(movie.id);
      toast.error(`Removed from Watchlist`);
    } else {
      saveToWatchlist(movie);
      toast.success(`Added to Watchlist`);
    }
    setIsSaved(!isSaved);
  };

  const releaseDate = movie.release_date
    ? new Date(movie.release_date).toLocaleDateString("en-GB", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Unknown";

  const cast = movie.credits?.cast?.slice(0, 5) ?? [];

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
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative w-[95vw] sm:w-full max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl"
        >
          {/* 🔲 Animated Backdrop */}
          <motion.div
            className="absolute inset-0 z-0 overflow-hidden"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <motion.img
              src={backdrop}
              alt="Backdrop"
              className="w-full h-full object-cover"
              initial={{ scale: 1.05 }}
              animate={{ scale: 1 }}
              exit={{ scale: 1.05 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
            <div className="absolute inset-0 bg-black/70" />
          </motion.div>

          {/* 🧊 Modal Content */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="relative z-10 px-4 py-6 sm:p-8 text-white space-y-6 bg-gradient-to-b from-black/80 via-black/60 to-black/90 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex flex-col sm:flex-row gap-6 sm:items-start">
              {/* 🎞️ Poster */}
              <motion.img
                src={poster}
                alt={title}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="w-36 sm:w-44 rounded-lg shadow-lg object-cover"
              />

              {/* 📃 Details */}
              <div className="flex-1 space-y-4">
                <h2 className="text-3xl sm:text-4xl font-bold">{title}</h2>

                {movie.overview && (
                  <p className="text-md text-zinc-200 leading-relaxed">
                    {movie.overview}
                  </p>
                )}

                {/* 📌 Metadata */}
                {movie.media_type !== "person" && (
                  <div className="flex flex-wrap gap-2 sm:gap-3 items-center text-sm text-right sm:text-base text-zinc-300 pt-2">
                    {movie.isNew && (
                      <span className="bg-amber-400 text-white text-xs font-bold px-2 py-0.5 rounded shadow-sm">
                        NEW
                      </span>
                    )}

                    {movie.genres?.length > 0 && (
                      <span className="italic truncate">
                        {movie.genres.join(", ")}
                      </span>
                    )}
                    <span>·</span>
                    <span>{releaseDate}</span>

                    {movie.runtime && (
                      <>
                        <span>·</span>
                        <span>{movie.runtime} mins</span>
                      </>
                    )}

                    {movie.original_language && (
                      <>
                        <span>·</span>
                        <span className="capitalize">
                          {new Intl.DisplayNames(["en"], {
                            type: "language",
                          }).of(movie.original_language)}
                        </span>
                      </>
                    )}

                    <span>·</span>
                    <span className="bg-yellow-400 text-black font-bold px-2 py-0.5 rounded shadow-sm">
                      {movie.vote_average?.toFixed(1) || "?"}
                    </span>
                  </div>
                )}

                {/* 🧑 Cast */}
                {cast.length > 0 && (
                  <div className="pt-2 text-sm text-zinc-400">
                    <p>
                      <span className="font-semibold text-zinc-300">
                        Starring:
                      </span>{" "}
                      {cast.map((actor, i) => (
                        <span key={actor.id}>
                          {actor.name}
                          {i < cast.length - 1 ? ", " : ""}
                        </span>
                      ))}
                    </p>
                  </div>
                )}

                {/* 🎬 Watch Button */}
                {movie.media_type !== "person" && (
                  <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.4 }}
                    className="pt-2"
                  >
                    <button
                      className="bg-yellow-400 hover:bg-yellow-300 text-black text-xl font-semibold px-6 py-2 rounded-xl shadow-md transition cursor-pointer"
                      onClick={() => console.log("Watch clicked for:", title)}
                    >
                      Watch
                    </button>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

          {/* ❤️ Watch Later Button */}
          {movie.media_type !== "person" && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleToggleWatchlist}
              className={`absolute top-3 left-3 z-50 ${
                isSaved ? "text-yellow-400" : "text-white"
              } hover:text-yellow-400 bg-black/60 backdrop-blur p-2 rounded-full shadow-md transition cursor-pointer`}
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
            className="absolute top-3 right-3 z-50 text-white hover:text-yellow-400 cursor-pointer"
            onClick={onClose}
          >
            <X
              size={28}
              className="p-1 bg-black/60 rounded-full backdrop-blur"
            />
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
