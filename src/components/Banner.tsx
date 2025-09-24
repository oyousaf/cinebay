import { motion, AnimatePresence } from "framer-motion";
import type { Movie } from "@/types/movie";
import { useVideoEmbed } from "@/hooks/useVideoEmbed";

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

  return (
    <div className="relative w-full min-h-[70vh] flex flex-col justify-end overflow-hidden shadow-2xl">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={item.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="absolute inset-0"
        >
          {/* Backdrop with subtle zoom */}
          <motion.img
            key={item.backdrop_path || "fallback"}
            src={
              item.backdrop_path
                ? `https://image.tmdb.org/t/p/original${item.backdrop_path}`
                : "/fallback-bg.png"
            }
            alt={item.title || item.name}
            className="w-full h-full object-cover"
            initial={{ scale: 1.02 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Overlay */}
      <motion.div
        key={`${item.id}-overlay`}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="relative z-20 px-6 md:px-12 py-10 max-w-6xl mx-auto"
      >
        <h2 className="text-4xl sm:text-6xl font-extrabold mb-4 text-[#80ffcc] drop-shadow-md">
          {item.title || item.name}
        </h2>

        <p className="text-sm md:text-xl text-gray-200 max-w-2xl mb-6 line-clamp-4">
          {item.overview}
        </p>

        {/* Meta info row */}
        <div className="flex flex-wrap gap-2 sm:gap-3 text-sm sm:text-base text-zinc-300 mb-6 items-center">
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
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => embedUrl && onWatch(item)}
            className="bg-[hsl(var(--foreground))] hover:bg-[hsl(var(--foreground))]/90 text-[hsl(var(--background))] uppercase text-lg sm:text-xl font-semibold px-6 py-2 rounded-full transition shadow-[0_0_6px_hsl(var(--foreground)/0.6),0_0_12px_hsl(var(--foreground)/0.4)]"
          >
            ▶ Watch
          </button>
          <button
            onClick={() => onSelect(item)}
            className="bg-[hsl(var(--foreground))] hover:bg-[hsl(var(--foreground))]/90 text-[hsl(var(--background))] uppercase text-lg sm:text-xl font-semibold px-6 py-2 rounded-lg transition shadow-md"
          >
            More Info
          </button>
        </div>
      </motion.div>

      {/* Section label */}
      <span className="absolute top-6 left-6 text-xs uppercase tracking-widest bg-black/40 px-3 py-1 rounded-md text-gray-200 z-20">
        {title}
      </span>
    </div>
  );
}
