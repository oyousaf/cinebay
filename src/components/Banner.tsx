import { motion, AnimatePresence, Variants } from "framer-motion";
import type { Movie } from "@/types/movie";
import { FaInfoCircle, FaPlay } from "react-icons/fa";
import { Bookmark } from "lucide-react";
import { useWatchlist } from "@/context/WatchlistContext";
import { useVideoEmbed } from "@/hooks/useVideoEmbed";
import { getTVProgress } from "@/lib/continueWatching";

export default function Banner({
  item,
  onSelect,
  onWatch,
}: {
  item: Movie;
  onSelect: (movie: Movie) => void;
  onWatch: (url: string) => void;
}) {
  const isTV = item.media_type === "tv";
  const isMovie = item.media_type === "movie";

  const movieEmbedUrl = isMovie
    ? useVideoEmbed(item.id, item.media_type)
    : null;

  const { toggleWatchlist, isInWatchlist } = useWatchlist();
  const isSaved = isInWatchlist(item.id);

  /* ---------- TV resume logic ---------- */
  const tvProgress = isTV ? getTVProgress(item.id) : null;

  const tvPlayUrl = isTV
    ? tvProgress
      ? `https://vidlink.pro/tv/${item.id}/${tvProgress.season}/${tvProgress.episode}`
      : `https://vidlink.pro/tv/${item.id}/1/1`
    : null;

  const playUrl = isMovie ? movieEmbedUrl : tvPlayUrl;

  const playLabel = isTV
    ? tvProgress
      ? `Resume S${tvProgress.season}E${tvProgress.episode}`
      : "Play S1E1"
    : "Play";

  /* ---------- Animations ---------- */
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
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  return (
    <div className="relative w-full h-[70vh] sm:h-full flex flex-col justify-end overflow-hidden shadow-2xl snap-start">
      {/* Backdrop */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={item.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 z-0"
        >
          <img
            src={
              item.backdrop_path
                ? `https://image.tmdb.org/t/p/original${item.backdrop_path}`
                : "/fallback-bg.png"
            }
            alt={item.title || item.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Overlay */}
      <motion.div
        className="relative z-10 px-4 md:px-12 py-6 md:py-10 max-w-6xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <motion.h2
          className="font-extrabold mb-5 text-[hsl(var(--foreground))] text-[clamp(1.9rem,4.5vw,3.1rem)]"
          variants={childVariants}
        >
          {item.title || item.name}
        </motion.h2>

        <motion.p
          className="text-gray-200 max-w-4xl mb-8"
          variants={childVariants}
        >
          {item.overview}
        </motion.p>

        {/* Actions */}
        <motion.div className="flex gap-3 items-center" variants={childVariants}>
          <motion.button
            disabled={!playUrl}
            onClick={() => playUrl && onWatch(playUrl)}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold
              ${
                playUrl
                  ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
                  : "bg-gray-600/50 text-gray-400"
              }`}
          >
            <FaPlay size={22} />
            <span>{playLabel}</span>
          </motion.button>

          <motion.button
            onClick={() => onSelect(item)}
            className="bg-[hsl(var(--foreground))] text-[hsl(var(--background))] p-3 rounded-full"
          >
            <FaInfoCircle size={22} />
          </motion.button>

          <motion.button
            onClick={() => toggleWatchlist(item)}
            aria-pressed={isSaved}
            className="bg-[hsl(var(--foreground))] text-[hsl(var(--background))] p-3 rounded-full"
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
