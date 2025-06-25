import { useEffect, useState, useRef } from "react";
import { motion, useAnimation } from "framer-motion";
import { DEVS_PICK_TITLES } from "@/lib/constants/devsPick";
import { fetchDevsPick, TMDB_IMAGE } from "@/lib/tmdb";
import type { Movie } from "@/types/movie";

const SCROLL_SPEED = 20;

export default function DevsPick({
  onSelect,
}: {
  onSelect: (movie: Movie) => void;
}) {
  const [movies, setMovies] = useState<Movie[]>([]);
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
    if (!galleryWidth || movies.length === 0) return;
    running.current = true;
    controls.start({
      x: -galleryWidth,
      transition: {
        duration: galleryWidth / SCROLL_SPEED,
        ease: "linear",
      },
    });
  };

  useEffect(() => {
    fetchDevsPick(DEVS_PICK_TITLES).then(setMovies);
  }, []);

  useEffect(() => {
    if (galleryRef.current) {
      setGalleryWidth(galleryRef.current.scrollWidth / 2);
    }
  }, [movies]);

  useEffect(() => {
    if (!galleryWidth || movies.length === 0) return;
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
  }, [galleryWidth, movies]);

  return (
    <motion.div
      className="w-full overflow-hidden py-12 select-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6, duration: 0.7, ease: "easeOut" }}
    >
      <h2
        className="font-heading text-3xl md:text-5xl font-bold mb-8 w-full text-center tracking-wide"
        style={{
          letterSpacing: "0.04em",
          textShadow: "0 2px 16px #3b006a33",
        }}
      >
        Dev&apos;s Pick
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
          style={{ willChange: "transform", touchAction: "pan-x" }}
        >
          {[...movies, ...movies].map((movie, idx) => (
            <motion.div
              key={`${movie.id}-${idx}`}
              whileHover={{
                scale: 1.11,
                transition: { type: "spring", stiffness: 300, damping: 20 },
              }}
              className="transition-transform duration-300 cursor-pointer shrink-0"
              onClick={() => !isDragging.current && onSelect(movie)}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
            >
              <img
                src={TMDB_IMAGE + movie.poster_path}
                alt={movie.title}
                className="h-52 w-36 md:h-72 md:w-52 lg:h-80 lg:w-56 object-cover rounded-xl shadow pointer-events-none select-none"
                draggable={false}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
