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
  title,
}: {
  item: Movie;
  onSelect: (movie: Movie) => void;
  onWatch: (movie: Movie) => void;
  title: string;
}) {
  const embedUrl = useVideoEmbed(item.id, item.media_type);
  const { toggleWatchlist, isInWatchlist } = useWatchlist();
  const isSaved = isInWatchlist(item.id);

  // Variants for staggered fade-in
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
          className="absolute inset-0"
        >
          {/* Backdrop with responsive sources */}
          {item.backdrop_path ? (
            <picture>
              {/* Mobile */}
              <source
                media="(max-width: 640px)"
                srcSet={`https://image.tmdb.org/t/p/w780${item.backdrop_path}`}
              />
              {/* Tablet */}
              <source
                media="(max-width: 1280px)"
                srcSet={`https://image.tmdb.org/t/p/w1280${item.backdrop_path}`}
              />
              {/* Desktop/4K */}
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

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Bookmark Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => toggleWatchlist(item)}
        aria-label={isSaved ? "Remove from Watchlist" : "Add to Watchlist"}
        aria-pressed={isSaved}
        className="absolute top-6 right-6 z-30 p-2 rounded-full backdrop-blur-md shadow-md 
                   bg-[hsl(var(--background))] text-[hsl(var(--foreground))] 
                   hover:shadow-[0_0_8px_hsl(var(--foreground)/0.4)] transition"
      >
        <Bookmark
          size={22}
          strokeWidth={isSaved ? 3 : 2}
          className={isSaved ? "fill-[hsl(var(--foreground))]" : "fill-none"}
        />
      </motion.button>

      {/* Overlay content */}
      <motion.div
        className="relative z-20 px-6 md:px-12 py-10 max-w-6xl mx-auto"
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
          className="text-sm md:text-xl text-gray-200 max-w-2xl mb-6 line-clamp-4"
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

        {/* Actions */}
        <motion.div className="flex gap-4" variants={childVariants}>
          <button
            onClick={() => embedUrl && onWatch(item)}
            className="bg-[hsl(var(--foreground))] hover:bg-[hsl(var(--foreground))]/90 text-[hsl(var(--background))] uppercase text-lg sm:text-xl font-semibold px-6 py-2 rounded-full transition shadow-[0_0_6px_hsl(var(--foreground)/0.6),0_0_12px_hsl(var(--foreground)/0.4)]"
          >
            <FaPlay />
          </button>
          <button
            onClick={() => onSelect(item)}
            className="bg-[hsl(var(--foreground))] hover:bg-[hsl(var(--foreground))]/90 text-[hsl(var(--background))] uppercase text-lg sm:text-xl font-semibold px-6 py-2 rounded-lg transition shadow-md"
          >
            <FaInfoCircle />
          </button>
        </motion.div>
      </motion.div>

      {/* Section label */}
      <span className="absolute top-6 left-6 text-xs uppercase tracking-widest bg-black/40 px-3 py-1 rounded-md text-gray-200 z-20">
        {title}
      </span>
    </div>
  );
}
