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
    <div className="relative w-full h-[70vh] sm:h-full flex flex-col justify-end overflow-hidden shadow-2xl snap-start">
      {/* Backdrop */}
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
            <img
              src={`https://image.tmdb.org/t/p/original${item.backdrop_path}`}
              alt={item.title || item.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <img
              src="/fallback-bg.png"
              alt="Fallback background"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          )}
          <div className="absolute inset-0 z-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Overlay */}
      <motion.div
        className="relative z-10 px-4 md:px-12 py-6 md:py-10 max-w-6xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="show"
        key={`overlay-${item.id}`}
      >
        <motion.h2
          className="font-extrabold mb-4 text-[#80ffcc] drop-shadow-md text-[clamp(1.5rem,4vw,3rem)]"
          variants={childVariants}
        >
          {item.title || item.name}
        </motion.h2>

        <motion.p
          className="text-gray-200 leading-relaxed max-w-3xl mb-6 text-[clamp(0.9rem,1.2vw+0.5rem,1.25rem)]"
          variants={childVariants}
        >
          {item.overview}
        </motion.p>

        {/* Actions */}
        <motion.div
          className="flex gap-3 items-center"
          variants={childVariants}
        >
          <motion.button
            whileHover={{ scale: embedUrl ? 1.05 : 1 }}
            whileTap={{ scale: embedUrl ? 0.95 : 1 }}
            disabled={!embedUrl}
            onClick={() => embedUrl && onWatch(embedUrl)}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-full transition 
              text-[clamp(1rem,1.2vw+0.5rem,1.25rem)] font-semibold
              ${
                embedUrl
                  ? "bg-[hsl(var(--foreground))] hover:bg-[hsl(var(--foreground))]/90 text-[hsl(var(--background))]"
                  : "bg-gray-600/50 text-gray-400 cursor-not-allowed"
              }`}
          >
            {!embedUrl ? "Loading…" : <FaPlay size={24} />}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(item)}
            className="bg-[hsl(var(--foreground))] text-[hsl(var(--background))] p-3 rounded-full transition shadow-md"
          >
            <FaInfoCircle size={22} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => toggleWatchlist(item)}
            aria-label={isSaved ? "Remove from Watchlist" : "Add to Watchlist"}
            aria-pressed={isSaved}
            className="bg-[hsl(var(--foreground))] text-[hsl(var(--background))] p-3 rounded-full transition shadow-md"
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
