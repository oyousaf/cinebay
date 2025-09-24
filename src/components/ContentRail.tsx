import { useState, useEffect, useRef, KeyboardEvent } from "react";
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
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (items.length > 0 && !activeItem) {
      setActiveItem(items[0]);
    }
  }, [items, activeItem]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!items.length || !activeItem) return;
    const currentIndex = items.findIndex((m) => m.id === activeItem.id);
    let nextIndex = currentIndex;

    if (e.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % items.length;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + items.length) % items.length;
    }

    if (nextIndex !== currentIndex) {
      setActiveItem(items[nextIndex]);
      buttonsRef.current[nextIndex]?.focus();
      buttonsRef.current[nextIndex]?.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
      e.preventDefault();
    }
  };

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

      <div
        className="relative z-30 mt-4 px-4 md:px-8 max-w-6xl mx-auto"
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <div className="flex overflow-x-auto gap-4 scrollbar-hide pb-6 overscroll-x-contain snap-x snap-mandatory scroll-smooth px-2">
          {items.map((movie, idx) => {
            const isActive = activeItem?.id === movie.id;
            return (
              <motion.button
                key={movie.id}
                ref={(el) => {
                  buttonsRef.current[idx] = el;
                }}
                aria-label={movie.title}
                className={`relative shrink-0 snap-start rounded-lg overflow-hidden focus:outline-none transition-all duration-300
                  ${
                    isActive
                      ? "scale-105 ring-2 ring-[#80ffcc] shadow-[0_0_6px_#80ffcc,0_0_12px_#80ffcc] shadow-pulse"
                      : "hover:shadow-[0_0_6px_#80ffcc,0_0_12px_#80ffcc]"
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
                  className="h-40 w-28 md:h-56 md:w-40 lg:h-64 lg:w-44 object-cover rounded-lg shadow-lg"
                  loading="lazy"
                />
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
