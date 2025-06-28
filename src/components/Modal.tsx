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

  const title = movie.title || movie.name || "Untitled";

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
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative w-[95vw] sm:w-full max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl"
        >
          {/* Background */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${backdrop})` }}
          >
            <div className="absolute inset-0 bg-black/70" />
          </div>

          {/* Content */}
          <div className="relative z-10 px-4 py-6 sm:p-8 text-white space-y-6 bg-gradient-to-b from-black/80 via-black/60 to-black/90">
            {movie.media_type === "person" ? (
              // 👤 Person Layout
              <div className="flex flex-col sm:flex-row gap-6 sm:items-start">
                <img
                  src={poster}
                  alt={title}
                  className="w-36 sm:w-44 rounded-lg shadow-lg object-cover"
                />
                <div className="flex-1 space-y-4">
                  <h2 className="text-3xl sm:text-4xl font-bold">{title}</h2>
                  {movie.overview ? (
                    <p className="text-sm text-zinc-200 leading-relaxed">
                      {movie.overview}
                    </p>
                  ) : (
                    <p className="text-sm italic text-zinc-400">
                      No biography available.
                    </p>
                  )}

                  {movie.id && (
                    <a
                      href={`https://www.themoviedb.org/person/${movie.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-yellow-300 hover:underline"
                    >
                      View on TMDB →
                    </a>
                  )}

                  {movie.media_type === "person" &&
                    Array.isArray(movie.known_for) &&
                    movie.known_for.length > 0 && (
                      <div className="pt-4">
                        <h3 className="text-lg font-semibold text-white mb-2">
                          Known For
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          {movie.known_for!.map((item) => {
                            const knownTitle = item.title || item.name;
                            const poster = item.poster_path
                              ? `https://image.tmdb.org/t/p/w185${item.poster_path}`
                              : "/fallback.jpg";

                            return (
                              <div
                                key={`${item.media_type}-${item.id}`}
                                className="space-y-1"
                              >
                                <img
                                  src={poster}
                                  alt={knownTitle}
                                  className="w-full rounded-lg object-cover shadow-md"
                                />
                                <div className="text-sm text-zinc-200 truncate">
                                  {knownTitle}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  <button
                    className="mt-4 bg-yellow-400 hover:bg-yellow-300 text-black text-base font-semibold px-6 py-2 rounded-xl shadow-md transition"
                    onClick={() => console.log("View profile:", title)}
                  >
                    View Profile
                  </button>
                </div>
              </div>
            ) : (
              // 🎬 Movie/TV Layout
              <div className="flex flex-col sm:flex-row gap-6 sm:items-start">
                <img
                  src={poster}
                  alt={title}
                  className="w-36 sm:w-44 rounded-lg shadow-lg object-cover"
                />
                <div className="flex-1 space-y-2">
                  <div className="text-sm text-zinc-300">{subtitle}</div>
                  <h2 className="text-3xl sm:text-4xl font-bold">{title}</h2>
                  {movie.overview && (
                    <p className="text-md text-zinc-200 leading-relaxed">
                      {movie.overview}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Watch Button */}
            {movie.media_type !== "person" && (
              <div className="pt-4">
                <button
                  className="bg-yellow-400 hover:bg-yellow-300 text-black text-xl font-semibold px-6 py-2 rounded-xl shadow-md transition"
                  onClick={() => console.log("Watch clicked for:", title)}
                >
                  Watch
                </button>
              </div>
            )}
          </div>

          {/* ❌ Close Button */}
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
