// components/ScrollGallery.tsx
import { useEffect, useRef, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import type { Movie } from "@/types/movie";

const SCROLL_SPEED = 20;

export default function Scroll({
  title,
  items,
  onSelect,
}: {
  title: string;
  items: Movie[];
  onSelect: (movie: Movie) => void;
}) {
  const galleryRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();
  const [galleryWidth, setGalleryWidth] = useState(0);
  const running = useRef(true);
  const isDragging = useRef(false);
  let dragStartX = 0;

  const handleTouchStart = (e: React.TouchEvent) => {
    isDragging.current = false;
    dragStartX = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const deltaX = Math.abs(e.touches[0].clientX - dragStartX);
    if (deltaX > 10) isDragging.current = true;
  };

  const pause = () => {
    running.current = false;
    controls.stop();
  };

  const resume = () => {
    if (!galleryWidth || items.length === 0) return;
    running.current = true;
    controls.start({
      x: -galleryWidth,
      transition: { duration: galleryWidth / SCROLL_SPEED, ease: "linear" },
    });
  };

  useEffect(() => {
    if (galleryRef.current) {
      setGalleryWidth(galleryRef.current.scrollWidth / 2);
    }
  }, [items]);

  useEffect(() => {
    if (!galleryWidth || items.length === 0) return;
    running.current = true;

    const loop = async () => {
      const duration = galleryWidth / SCROLL_SPEED;
      while (running.current) {
        await controls.start({
          x: -galleryWidth,
          transition: { duration, ease: "linear" },
        });
        controls.set({ x: 0 });
      }
    };

    loop();
    return () => {
      running.current = false;
      controls.stop();
    };
  }, [galleryWidth, items]);

  return (
    <motion.div
      className="w-full overflow-hidden py-12 select-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <h2 className="font-heading text-3xl md:text-5xl font-bold mb-8 text-center tracking-wide">
        {title}
      </h2>
      <div
        className="relative w-full overflow-x-auto scrollbar-hide"
        style={{
          WebkitOverflowScrolling: "touch",
          maskImage:
            "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
        }}
        onMouseEnter={pause}
        onMouseLeave={resume}
        onTouchStart={pause}
        onTouchEnd={resume}
        ref={galleryRef}
      >
        <motion.div
          className="flex gap-4 sm:gap-6 w-max px-2"
          animate={controls}
          style={{ touchAction: "pan-x" }}
        >
          {[...items, ...items].map((movie, idx) => (
            <motion.div
              key={`${movie.id}-${idx}`}
              whileHover={{
                scale: 1.11,
                transition: { type: "spring", stiffness: 300, damping: 20 },
              }}
              className="cursor-pointer shrink-0"
              onClick={() => !isDragging.current && onSelect(movie)}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
            >
              <div className="relative">
                <img
                  src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                  alt={movie.title}
                  className="h-52 w-36 md:h-72 md:w-52 lg:h-80 lg:w-56 object-cover rounded-lg shadow pointer-events-none"
                  draggable={false}
                />
                <div className="absolute bottom-1 right-1 bg-yellow-400 text-black text-xs md:text-sm px-1.5 py-0.5 rounded font-semibold shadow">
                  {movie.vote_average.toFixed(1)}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
