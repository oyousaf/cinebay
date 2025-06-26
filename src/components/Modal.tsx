import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
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

  const title = movie.title || "Untitled";

  const subtitle =
    movie.media_type === "person"
      ? ""
      : `${movie.genres?.join(", ") || "N/A"} · ${
          movie.release_date?.slice(0, 4) || "?" 
        } · ⭐ ${movie.vote_average?.toFixed(1) || "?"}`;

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
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative w-full max-w-4xl rounded-xl overflow-hidden shadow-lg"
        >
          {/* Background */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${backdrop})` }}
          >
            <div className="absolute inset-0 bg-black/70" />
          </div>

          {/* Conditional Layout */}
          {movie.media_type === "person" ? (
            // 👤 Person Layout
            <div className="relative z-10 p-6 sm:p-8 text-white space-y-6 bg-gradient-to-b from-black/80 via-black/60 to-black/90 flex flex-col sm:flex-row gap-6 sm:items-start">
              <img
                src={poster}
                alt={title}
                className="w-36 sm:w-44 rounded-lg shadow-lg object-cover"
              />
              <div className="flex-1 space-y-4">
                <h2 className="text-3xl sm:text-4xl font-bold text-white">
                  {title}
                </h2>
                {movie.overview ? (
                  <p className="text-sm text-zinc-200 leading-relaxed">
                    {movie.overview}
                  </p>
                ) : (
                  <p className="text-sm italic text-zinc-400">
                    No biography available.
                  </p>
                )}
                <button
                  className="mt-4 bg-yellow-400 hover:bg-yellow-300 text-black text-base font-semibold px-6 py-2 rounded-xl shadow-md transition"
                  onClick={() => console.log("View profile:", movie.title)}
                >
                  View Profile
                </button>
              </div>
            </div>
          ) : (
            // 🎬 Movie/TV Layout
            <div className="relative z-10 p-6 sm:p-8 text-white space-y-6 bg-gradient-to-b from-black/80 via-black/60 to-black/90">
              <div className="flex flex-col sm:flex-row gap-6 sm:items-start">
                <img
                  src={poster}
                  alt={title}
                  className="w-36 sm:w-44 rounded-lg shadow-lg object-cover"
                />
                <div className="flex-1 flex flex-col justify-between right-4 space-y-2">
                  <div className="text-sm text-zinc-300">{subtitle}</div>
                  <h2 className="text-3xl sm:text-4xl font-bold text-white">
                    {title}
                  </h2>
                  {movie.overview && (
                    <p className="text-md text-zinc-200 leading-relaxed">
                      {movie.overview}
                    </p>
                  )}
                </div>
              </div>
              <div className="pt-4">
                <button
                  className="bg-yellow-400 hover:bg-yellow-300 text-black text-xl font-semibold px-6 py-2 rounded-xl shadow-md transition"
                  onClick={() =>
                    console.log("Watch clicked for:", movie.title)
                  }
                >
                  Watch
                </button>
              </div>
            </div>
          )}

          {/* Close Button */}
          <button
            className="absolute top-3 right-3 z-50 text-white hover:text-yellow-400 cursor-pointer"
            onClick={onClose}
          >
            <X size={24} />
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
