import { useEffect, useState, useRef } from "react";
import { motion, useAnimation } from "framer-motion";
import { fetchShows, TMDB_IMAGE } from "@/lib/tmdb";
import type { Movie } from "@/types/movie";

const SCROLL_SPEED = 20;

export default function YouShouldWatch() {
  const [picks, setPicks] = useState<Movie[]>([]);
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
    if (!galleryWidth || picks.length === 0) return;
    running.current = true;
    controls.start({
      x: -galleryWidth,
      transition: { duration: galleryWidth / SCROLL_SPEED, ease: "linear" },
    });
  };

  useEffect(() => {
    fetchShows().then(setPicks);
  }, []);

  useEffect(() => {
    if (galleryRef.current) {
      const totalWidth = galleryRef.current.scrollWidth / 2;
      setGalleryWidth(totalWidth);
    }
  }, [picks]);

  useEffect(() => {
    if (!galleryWidth || picks.length === 0) return;
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
  }, [galleryWidth, picks]);

  return (
    <motion.div
      className="w-full overflow-hidden py-12 select-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <h2 className="font-heading text-3xl md:text-5xl font-bold mb-8 text-center tracking-wide">
        Shows
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
          {[...picks, ...picks].map(
            (movie, idx) =>
              movie.poster_path && (
                <motion.div
                  key={`${movie.id}-${idx}`}
                  whileHover={{ scale: 1.05 }}
                  className="cursor-pointer shrink-0"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                >
                  <img
                    src={TMDB_IMAGE + movie.poster_path}
                    alt={movie.title}
                    className="h-52 w-36 md:h-72 md:w-52 lg:h-80 lg:w-56 object-cover rounded-xl shadow pointer-events-none"
                    draggable={false}
                  />
                </motion.div>
              )
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
