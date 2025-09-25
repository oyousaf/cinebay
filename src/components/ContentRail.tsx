import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import type { Movie } from "@/types/movie";
import Banner from "./Banner";

interface ContentRailProps {
  title: string;
  items: Movie[];
  onSelect: (movie: Movie) => void;
  onWatch: (movie: Movie) => void;
}

export default function ContentRail({
  title,
  items,
  onSelect,
  onWatch,
}: ContentRailProps) {
  const [activeItem, setActiveItem] = useState<Movie | null>(null);

  useEffect(() => {
    if (items.length > 0 && !activeItem) {
      setActiveItem(items[0]);
    }
  }, [items, activeItem]);

  return (
    <section className="relative w-full">
      <div className="min-h-[70vh] w-full">
        {activeItem ? (
          <Banner
            item={activeItem}
            onSelect={onSelect}
            onWatch={onWatch}
            title={title}
          />
        ) : (
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-[hsl(var(--background))]">
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--background))] via-[hsl(var(--background))]/70 to-transparent" />
            <div className="w-full h-full bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 animate-pulse" />
            <span className="absolute text-zinc-400 text-sm tracking-wide">
              Loading {title}…
            </span>
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="relative z-30 mt-4 px-4 md:px-8 max-w-6xl mx-auto">
          <div className="flex overflow-x-auto gap-4 scrollbar-hide pb-6 overscroll-x-contain snap-x snap-mandatory scroll-smooth px-2">
            {items.map((movie) => {
              const isActive = activeItem?.id === movie.id;
              return (
                <motion.button
                  key={movie.id}
                  aria-label={movie.title || movie.name}
                  className={`relative shrink-0 snap-start rounded-lg overflow-hidden focus:outline-none transition-all duration-300
                    ${isActive ? "scale-105 shadow-pulse" : ""}`}
                  whileHover={
                    !isActive
                      ? {
                          scale: 1.07,
                          boxShadow: "0 0 15px hsl(var(--foreground))",
                        }
                      : {}
                  }
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
                    alt={movie.title || movie.name}
                    className="h-40 w-28 md:h-56 md:w-40 lg:h-64 lg:w-44 object-cover rounded-lg shadow-lg"
                    loading="lazy"
                  />
                </motion.button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
