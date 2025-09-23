import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import type { Movie } from "@/types/movie";

type LayoutMode = "prime" | "netflix" | "google";

interface ContentRailProps {
  title: string;
  items: Movie[];
  onSelect: (movie: Movie) => void;
  infoPosition?: LayoutMode;
}

export default function ContentRail({
  title,
  items,
  onSelect,
  infoPosition = "prime",
}: ContentRailProps) {
  const [activeItem, setActiveItem] = useState<Movie | null>(null);

  // Load first item automatically
  useEffect(() => {
    if (items.length > 0 && !activeItem) {
      setActiveItem(items[0]);
    }
  }, [items, activeItem]);

  // 🔹 Loader if no items yet
  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="h-8 w-8 text-[hsl(var(--foreground))] animate-spin" />
      </div>
    );
  }

  return (
    <section className="relative w-full md:pl-20 md:pb-6">
      {/* Banner */}
      {activeItem && (
        <Banner item={activeItem} onSelect={onSelect} title={title} />
      )}

      {/* Tiles (sit fully below banner, constrained + unclipped) */}
      <div className="relative z-30 mt-6 px-4 md:px-8 max-w-6xl mx-auto">
        <div className="flex overflow-x-auto gap-4 scrollbar-hide pb-6">
          {items.map((movie) => {
            const isActive = activeItem?.id === movie.id;
            return (
              <motion.div
                key={movie.id}
                className={`relative cursor-pointer shrink-0 rounded-lg overflow-hidden transition-all duration-300 ${
                  isActive
                    ? "scale-105 ring-2 ring-[#80ffcc] shadow-lg shadow-[#80ffcc]/40 glow-pulse"
                    : ""
                }`}
                whileHover={!isActive ? { scale: 1.07 } : {}}
                animate={isActive ? { scale: 1.05 } : { scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                onClick={() => setActiveItem(movie)}
              >
                <img
                  src={
                    movie.poster_path
                      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                      : "/fallback.png"
                  }
                  alt={movie.title}
                  className="h-40 w-28 md:h-60 md:w-44 lg:h-72 lg:w-52 object-cover rounded-lg shadow-lg"
                  loading="lazy"
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------
   Banner subcomponent
-------------------------------- */
function Banner({
  item,
  onSelect,
  title,
}: {
  item: Movie;
  onSelect: (movie: Movie) => void;
  title: string;
}) {
  const backdrop = item.backdrop_path
    ? `https://image.tmdb.org/t/p/original${item.backdrop_path}`
    : "/fallback-bg.png";

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
          src={backdrop}
          alt={item.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
      </div>

      {/* Overlay content */}
      <div className="relative z-20 px-6 md:px-12 py-10 max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-5xl font-bold mb-4 drop-shadow-md text-[#80ffcc]">
          {item.title || item.name}
        </h2>
        <p className="text-sm md:text-lg text-gray-200 max-w-2xl mb-6 line-clamp-4">
          {item.overview}
        </p>

        <div className="flex flex-wrap gap-4 text-sm text-gray-300 mb-6 items-center">
          {item.release_date && (
            <span>{new Date(item.release_date).getFullYear()}</span>
          )}
          {item.vote_average && (
            <span className="bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-sm font-semibold px-2 py-0.5 rounded-full shadow-[0_0_6px_hsl(var(--foreground)/0.6),0_0_12px_hsl(var(--foreground)/0.4)]">
              {item.vote_average.toFixed(1)}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => {
              console.log("▶ Watch clicked", item.title);
            }}
            className="bg-[hsl(var(--foreground))] hover:bg-[hsl(var(--foreground))]/90 text-[hsl(var(--background))] text-xl cursor-pointer uppercase font-semibold px-6 py-2 rounded-full transition shadow-[0_0_6px_hsl(var(--foreground)/0.6),0_0_12px_hsl(var(--foreground)/0.4)]"
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
