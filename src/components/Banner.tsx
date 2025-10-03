import { motion, AnimatePresence, Variants } from "framer-motion";
import type { Movie } from "@/types/movie";
import { useVideoEmbed } from "@/hooks/useVideoEmbed";
import { FaInfoCircle, FaPlay } from "react-icons/fa";
import { Bookmark } from "lucide-react";
import { useWatchlist } from "@/context/WatchlistContext";

export default function Banner({
  item,
  onSelect,
  onWatch,
}: {
  item: Movie;
  onSelect: (movie: Movie) => void;
  onWatch: (url: string) => void;
}) {
  const embedUrl = useVideoEmbed(item.id, item.media_type);
  const { toggleWatchlist, isInWatchlist } = useWatchlist();
  const isSaved = isInWatchlist(item.id);

  // Variants
  const containerVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.35,
        ease: [0.25, 0.1, 0.25, 1],
        staggerChildren: 0.05,
      },
    },
  };

  const childVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
  };

  return (
    <div className="relative w-full min-h-[70vh] flex flex-col justify-end overflow-hidden shadow-2xl">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={item.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="absolute inset-0 z-0"
        >
          {item.backdrop_path ? (
            <picture>
              <source
                media="(max-width: 640px)"
                srcSet={`https://image.tmdb.org/t/p/w780${item.backdrop_path}`}
              />
              <source
                media="(max-width: 1280px)"
                srcSet={`https://image.tmdb.org/t/p/w1280${item.backdrop_path}`}
              />
              <img
                src={`https://image.tmdb.org/t/p/original${item.backdrop_path}`}
                alt={item.title || item.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </picture>
          ) : (
            <img
              src="/fallback-bg.png"
              alt="Fallback background"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          )}

          {/* ✅ Explicit z-0 to avoid covering tiles */}
          <div className="absolute inset-0 z-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Overlay content */}
      <motion.div
        className="relative z-10 px-6 md:px-12 py-10 max-w-6xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="show"
        key={`overlay-${item.id}`}
      >
        <motion.h2
          className="text-4xl sm:text-6xl font-extrabold mb-4 text-[#80ffcc] drop-shadow-md"
          variants={childVariants}
        >
          {item.title || item.name}
        </motion.h2>

        <motion.p
          className="text-sm md:text-xl text-gray-200 max-w-3xl mb-8 leading-relaxed"
          variants={childVariants}
        >
          {item.overview}
        </motion.p>

        {/* Meta info row */}
        <motion.div
          className="flex flex-wrap gap-2 sm:gap-3 text-sm sm:text-base text-zinc-300 mb-6 items-center"
          variants={childVariants}
        >
          {item.isNew && (
            <span className="bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-sm font-bold px-2 py-0.5 rounded-full uppercase shadow-pulse">
              NEW
            </span>
          )}
          {item.release_date && (
            <span>{new Date(item.release_date).getFullYear()}</span>
          )}
          {typeof item.vote_average === "number" && item.vote_average > 0 && (
            <span className="bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-sm font-semibold px-2 py-0.5 rounded-full shadow-[0_0_6px_hsl(var(--foreground)/0.6),0_0_12px_hsl(var(--foreground)/0.4)]">
              {item.vote_average.toFixed(1)}
            </span>
          )}
        </motion.div>

        {/* Actions row */}
        <motion.div
          className="flex gap-4 items-center"
          variants={childVariants}
        >
          {/* Play */}
          <motion.button
            whileHover={{ scale: embedUrl ? 1.05 : 1 }}
            whileTap={{ scale: embedUrl ? 0.95 : 1 }}
            disabled={!embedUrl}
            onClick={() => embedUrl && onWatch(embedUrl)}
            className={`flex items-center justify-center gap-2 px-6 py-2 rounded-full transition text-lg sm:text-xl font-semibold 
              ${
                embedUrl
                  ? "bg-[hsl(var(--foreground))] hover:bg-[hsl(var(--foreground))]/90 text-[hsl(var(--background))] shadow-[0_0_6px_hsl(var(--foreground)/0.6),0_0_12px_hsl(var(--foreground)/0.4)]"
                  : "bg-gray-600/50 text-gray-400 cursor-not-allowed"
              }`}
          >
            {!embedUrl ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-gray-300"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4l3.5-3.5L12 0v4a8 8 0 00-8 8h4z"
                  />
                </svg>
                <span className="text-sm">Loading…</span>
              </>
            ) : (
              <FaPlay />
            )}
          </motion.button>

          {/* Info */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(item)}
            className="bg-[hsl(var(--foreground))] hover:bg-[hsl(var(--foreground))]/90 
                       text-[hsl(var(--background))] uppercase text-lg sm:text-xl 
                       font-semibold p-2 rounded-full transition shadow-md"
          >
            <FaInfoCircle />
          </motion.button>

          {/* Watchlist */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => toggleWatchlist(item)}
            aria-label={isSaved ? "Remove from Watchlist" : "Add to Watchlist"}
            aria-pressed={isSaved}
            className="bg-[hsl(var(--foreground))] hover:bg-[hsl(var(--foreground))]/90 
                       text-[hsl(var(--background))] uppercase text-lg sm:text-xl 
                       font-semibold p-2 rounded-full transition shadow-md"
          >
            <Bookmark
              size={22}
              strokeWidth={isSaved ? 3 : 2}
              className={
                isSaved ? "fill-[hsl(var(--background))]" : "fill-none"
              }
            />
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}
