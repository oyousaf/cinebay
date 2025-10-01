import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Movie } from "@/types/movie";
import Banner from "./Banner";
import { useNavigation } from "@/hooks/useNavigation";
import { Loader2 } from "lucide-react";

interface ContentRailProps {
  title: string;
  items: Movie[];
  onSelect: (movie: Movie) => void;   // ✅ still selects a movie
  onWatch: (url: string) => void;     // ✅ embedUrl for Banner only
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

  // 🎮 Remote/keyboard Enter handler → open modal, not play
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter" && railIndex !== null) {
        if (focus.section === railIndex) {
          const movie = items[focus.index];
          if (movie) {
            onSelect(movie); // ✅ open modal, not play
          }
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focus, railIndex, items, onSelect]);

  return (
    <section className="relative w-full">
      {/* Banner / Loader wrapper */}
      <div className="relative min-h-[70vh] w-full flex items-center justify-center">
        {!activeItem ? (
          <motion.div
            key="loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-center"
          >
            <Loader2 className="animate-spin w-8 h-8 text-[hsl(var(--foreground))]" />
          </motion.div>
        ) : (
          <motion.div
            key="banner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full h-full"
          >
            {/* ✅ Banner handles Play with embedUrl */}
            <Banner item={activeItem} onSelect={onSelect} onWatch={onWatch} />
          </motion.div>
        )}
      </div>

      {/* Tiles */}
      {items.length > 0 && railIndex !== null && (
        <motion.div
          key="tiles"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative z-30 mt-4 px-4 md:px-8 max-w-6xl mx-auto"
        >
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
                        : "hover:scale-105 hover:shadow-lg opacity-50 hover:opacity-80"
                    }`}
                  animate={isFocused ? { scale: 1.1 } : { scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                    mass: 1,
                  }}
                  onClick={() => {
                    setActiveItem(movie);
                    if (railIndex !== null) {
                      setFocus({ section: railIndex, index: idx });
                    }
                    // ✅ Click = focus/select, not play
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
        </motion.div>
      )}
    </section>
  );
}
