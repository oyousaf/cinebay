import { motion, AnimatePresence, Variants } from "framer-motion";
import type { Movie } from "@/types/movie";
import { FaInfoCircle, FaPlay } from "react-icons/fa";
import { Bookmark } from "lucide-react";
import { useWatchlist } from "@/context/WatchlistContext";
import { useContinueWatching } from "@/hooks/useContinueWatching";
import type { PlaybackIntent } from "@/lib/embed/buildEmbedUrl";

export default function Banner({
  item,
  onSelect,
  onWatch,
}: {
  item: Movie;
  onSelect: (movie: Movie) => void;
  onWatch: (intent: PlaybackIntent) => void;
}) {
  const isTV = item.media_type === "tv";
  const isMovie = item.media_type === "movie";

  const { toggleWatchlist, isInWatchlist } = useWatchlist();
  const isSaved = isInWatchlist(item.id);

  const { getTVProgress } = useContinueWatching();
  const progress = isTV ? getTVProgress(item.id) : null;

  const hasResume = Boolean(progress);

  const intent: PlaybackIntent | null = isMovie
    ? { mediaType: "movie", tmdbId: item.id }
    : isTV && progress
      ? {
          mediaType: "tv",
          tmdbId: item.id,
          season: progress.season,
          episode: progress.episode,
        }
      : null;

  const containerVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.35, staggerChildren: 0.05 },
    },
  };

  const childVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  return (
    <div className="relative w-full h-[70vh] sm:h-full flex flex-col justify-end overflow-hidden shadow-2xl snap-start">
      <AnimatePresence>
        <motion.div
          key={item.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0"
        >
          <img
            src={
              item.backdrop_path
                ? `https://image.tmdb.org/t/p/original${item.backdrop_path}`
                : "/fallback-bg.png"
            }
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black via-black/70 to-transparent" />
        </motion.div>
      </AnimatePresence>

      <motion.div
        className="relative z-10 px-4 md:px-12 py-6 md:py-10 max-w-6xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <motion.h2
          className="font-extrabold mb-5 text-[clamp(1.9rem,4.5vw,3.1rem)]"
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

        <motion.div
          className="flex gap-3 items-center"
          variants={childVariants}
        >
          <motion.button
            disabled={!intent}
            onClick={() => intent && onWatch(intent)}
            className={`flex items-center gap-3 px-6 py-3 rounded-full font-semibold ${
              intent
                ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
                : "bg-gray-600/50 text-gray-400"
            }`}
          >
            <FaPlay size={20} />
            {hasResume && <span className="text-sm font-semibold">Resume</span>}
          </motion.button>

          <motion.button
            onClick={() => onSelect(item)}
            className="p-3 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
          >
            <FaInfoCircle size={22} />
          </motion.button>

          <motion.button
            onClick={() => toggleWatchlist(item)}
            aria-pressed={isSaved}
            className="p-3 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
          >
            <Bookmark
              size={22}
              strokeWidth={isSaved ? 3 : 2}
              className={isSaved ? "fill-current" : "fill-none"}
            />
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}
