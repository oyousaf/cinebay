import { motion } from "framer-motion";
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
    <motion.div
      className="relative w-full min-h-[70vh] flex flex-col justify-end overflow-hidden shadow-lg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0">
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
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
      </div>

      {/* Overlay */}
      <div className="relative z-20 px-6 md:px-12 py-10 max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-5xl font-bold mb-4 drop-shadow-md text-[#80ffcc]">
          {item.title || item.name}
        </h2>
        <p className="text-sm md:text-lg text-gray-200 max-w-2xl mb-6 line-clamp-4">
          {item.overview}
        </p>

        <div className="flex gap-4">
          <button
            onClick={() => embedUrl && onWatch(item)}
            className="bg-[hsl(var(--foreground))] hover:bg-[hsl(var(--foreground))]/90 uppercase text-[hsl(var(--background))] text-xl font-semibold px-6 py-2 rounded-full transition"
          >
            ▶ Watch
          </button>
          <button
            onClick={() => onSelect(item)}
            className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg font-semibold text-white"
          >
            More Info
          </button>
        </div>
      </div>

      {/* Title overlay */}
      <span className="absolute top-6 left-6 text-xs uppercase tracking-widest bg-black/40 px-3 py-1 rounded-md text-gray-200 z-20">
        {title}
      </span>
    </motion.div>
  );
}
