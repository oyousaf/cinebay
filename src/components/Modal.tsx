import { motion, AnimatePresence } from "framer-motion";
import { X, Heart } from "lucide-react";
import type { Movie } from "@/types/movie";
import { TMDB_IMAGE } from "@/lib/tmdb";

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
          {/* 🔲 Background */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${backdrop})` }}
          >
            <div className="absolute inset-0 bg-black/70" />
          </div>

          {/* 🧊 Modal Content */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="relative z-10 px-4 py-6 sm:p-8 text-white space-y-6 bg-gradient-to-b from-black/80 via-black/60 to-black/90 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex flex-col sm:flex-row gap-6 sm:items-start">
              {/* 🎞️ Poster Image */}
              <motion.img
                src={poster}
                alt={title}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="w-36 sm:w-44 rounded-lg shadow-lg object-cover"
              />

              {/* 📃 Text Block */}
              <div className="flex-1 space-y-4">
                <h2 className="text-3xl sm:text-4xl font-bold">{title}</h2>

                {movie.overview && (
                  <p className="text-md text-zinc-200 leading-relaxed">
                    {movie.overview}
                  </p>
                )}

                {movie.media_type !== "person" && (
                  <div className="flex flex-wrap justify-end items-center gap-2 text-xs sm:text-sm text-zinc-300 mt-4">
                    <span className="truncate max-w-full">
                      {movie.genres?.join(", ") || "N/A"}
                    </span>
                    <span className="hidden sm:inline">·</span>
                    <span>{movie.release_date?.slice(0, 4) || "?"}</span>
                    <span className="hidden sm:inline">·</span>
                    <span className="bg-yellow-400 text-black font-bold px-2 py-0.5 rounded shadow-sm">
                      {movie.vote_average?.toFixed(1) || "?"}
                    </span>
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
                      className="bg-yellow-400 hover:bg-yellow-300 text-black text-xl font-semibold px-6 py-2 rounded-xl shadow-md transition"
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
            <button
              onClick={() => console.log("Add to Watch Later:", movie.title)}
              className="absolute top-3 left-3 z-50 text-white hover:text-yellow-400 bg-black/60 backdrop-blur p-2 rounded-full shadow-md transition"
              title="Watch Later"
            >
              <Heart size={22} strokeWidth={2} />
            </button>
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
