import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Movie } from "@/types/movie";
import Banner from "./Banner";
import { useNavigation } from "@/hooks/useNavigation";

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
  const tileRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const { focus, setFocus, registerRail, updateRailLength } = useNavigation();
  const [railIndex, setRailIndex] = useState<number | null>(null);

  // Register this rail once
  useEffect(() => {
    if (railIndex === null) {
      const idx = registerRail(items.length);
      setRailIndex(idx);
    }
  }, [railIndex, registerRail, items.length]);

  // Update length + sync active item + scroll
  useEffect(() => {
    if (railIndex !== null) {
      updateRailLength(railIndex, items.length);

      if (items.length > 0 && focus.section === railIndex) {
        const focusedMovie = items[focus.index];
        if (focusedMovie && focusedMovie.id !== activeItem?.id) {
          setActiveItem(focusedMovie);
        }

        const el = tileRefs.current[focus.index];
        if (el) {
          el.scrollIntoView({
            behavior: "smooth",
            inline: "center",
            block: "nearest",
          });
        }
      }
    }
  }, [items, focus, railIndex, updateRailLength, activeItem]);

  // Default active when items load
  useEffect(() => {
    if (!activeItem && items.length > 0) {
      setActiveItem(items[0]);
      if (railIndex !== null) {
        setFocus({ section: railIndex, index: 0 });
      }
    }
  }, [items, activeItem, railIndex, setFocus]);

  return (
    <section className="relative w-full">
      {/* Banner */}
      <div className="min-h-[70vh] w-full">
        {activeItem ? (
          <Banner
            item={activeItem}
            onSelect={onSelect}
            onWatch={onWatch}
            title={title}
          />
        ) : (
          <div className="relative w-full h-full flex items-center justify-center bg-[hsl(var(--background))]">
            <span className="text-zinc-400 text-sm tracking-wide">
              Loading {title}…
            </span>
          </div>
        )}
      </div>

      {/* Tiles */}
      {items.length > 0 && railIndex !== null && (
        <div className="relative z-30 mt-4 px-4 md:px-8 max-w-6xl mx-auto">
          <div className="flex overflow-x-auto gap-4 pb-6 scroll-smooth px-2">
            {items.map((movie, idx) => {
              const isFocused =
                focus.section === railIndex && focus.index === idx;

              return (
                <motion.button
                  key={movie.id}
                  ref={(el) => {
                    tileRefs.current[idx] = el;
                  }}
                  aria-label={movie.title || movie.name}
                  className={`relative shrink-0 snap-start rounded-lg focus:outline-none transition-all duration-300
                    ${
                      isFocused
                        ? "ring-4 ring-[#80ffcc] scale-105 shadow-pulse"
                        : "hover:scale-105 hover:shadow-lg"
                    }`}
                  animate={isFocused ? { scale: 1.07 } : { scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  onClick={() => {
                    setActiveItem(movie);
                    if (railIndex !== null) {
                      setFocus({ section: railIndex, index: idx });
                    }
                  }}
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
