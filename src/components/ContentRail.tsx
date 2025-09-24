import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import type { Movie } from "@/types/movie";
import Banner from "./Banner";

type LayoutMode = "prime" | "netflix" | "google";

interface ContentRailProps {
  title: string;
  items: Movie[];
  onSelect: (movie: Movie) => void;
  onWatch: (movie: Movie) => void;
  infoPosition?: LayoutMode;
}

export default function ContentRail({
  title,
  items,
  onSelect,
  onWatch,
  infoPosition = "prime",
}: ContentRailProps) {
  const [activeItem, setActiveItem] = useState<Movie | null>(null);

  useEffect(() => {
    if (items.length > 0 && !activeItem) {
      setActiveItem(items[0]);
    }
  }, [items, activeItem]);

  return (
    <section className="relative w-full">
      {activeItem && (
        <Banner
          item={activeItem}
          onSelect={onSelect}
          onWatch={onWatch}
          title={title}
        />
      )}

      <div className="relative z-30 mt-6 px-4 md:px-8 max-w-6xl mx-auto">
        <div className="flex overflow-x-auto gap-4 scrollbar-hide pb-6 overscroll-x-contain snap-x snap-mandatory">
          {items.map((movie) => {
            const isActive = activeItem?.id === movie.id;
            return (
              <motion.div
                key={movie.id}
                className={`relative cursor-pointer shrink-0 snap-start rounded-lg overflow-hidden transition-all duration-300 ${
                  isActive
                    ? "scale-105 ring-2 dark:ring-[hsl(var(--foreground))] ring-[hsl(var(--background))] shadow-2xl shadow-pulse"
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
