import { useEffect, useRef, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import type { Movie } from "@/types/movie";

const SCROLL_SPEED = 20;

export default function ScrollGallery({
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
  const running = useRef(false);
  const isDragging = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  let dragStartX = 0;

  const tripledItems = [...items, ...items, ...items];

  const pause = () => {
    running.current = false;
    controls.stop();
  };

  const resume = () => {
    if (!galleryWidth || !items.length || running.current) return;
    running.current = true;
    animateLoop();
  };

  const animateLoop = async () => {
    const duration = galleryWidth / SCROLL_SPEED;
    while (running.current) {
      await controls.start({
        x: -galleryWidth,
        transition: { duration, ease: "linear" },
      });
      if (!running.current) break;
      controls.set({ x: 0 });
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    isDragging.current = false;
    dragStartX = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (Math.abs(e.touches[0].clientX - dragStartX) > 10) {
      isDragging.current = true;
    }
  };

  // Scroll to middle clone on mount
  useEffect(() => {
    const container = galleryRef.current;
    if (container && items.length) {
      setTimeout(() => {
        const itemWidth = container.scrollWidth / tripledItems.length;
        container.scrollLeft = itemWidth * items.length;
      }, 50);
    }
  }, [items]);

  // Loop scroll when reaching edges
  useEffect(() => {
    const container = galleryRef.current;
    if (!container || !items.length) return;

    const cards = container.querySelectorAll("[data-observe]");
    if (!cards.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const itemWidth = container.scrollWidth / tripledItems.length;
          const marker = (entry.target as HTMLElement).dataset.observe;
          if (marker === "start" || marker === "end") {
            container.scrollLeft = itemWidth * items.length;
          }
        }
      },
      { root: container, threshold: 0.9 }
    );

    observer.observe(cards[0]);
    observer.observe(cards[cards.length - 1]);
    observerRef.current = observer;

    return () => observer.disconnect();
  }, [items]);

  // Set gallery width for animation
  useEffect(() => {
    const container = galleryRef.current;
    if (container) {
      setGalleryWidth(container.scrollWidth / 3);
    }
  }, [items]);

  // Handle pause/resume on blur/focus
  useEffect(() => {
    if (galleryWidth && items.length) resume();
    const handleBlur = () => pause();
    const handleFocus = () => resume();
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    return () => {
      running.current = false;
      controls.stop();
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [galleryWidth, items]);

  return (
    <motion.div
      className="w-full overflow-x-hidden py-12 select-none z-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <h2 className="font-heading text-3xl md:text-5xl font-bold mb-8 text-center tracking-wide">
        {title}
      </h2>

      {/* Scrollable outer container */}
      <div
        ref={galleryRef}
        className="relative w-full overflow-x-auto scrollbar-hide"
        style={{
          WebkitOverflowScrolling: "touch",
          maskImage:
            "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)",
        }}
        onMouseEnter={pause}
        onMouseLeave={resume}
        onTouchStart={pause}
        onTouchEnd={resume}
      >
        {/* Animated scroll content */}
        <div className="w-max">
          <motion.div
            className="flex gap-4 sm:gap-6 px-2 pt-6 pb-4"
            animate={controls}
            style={{ touchAction: "pan-x" }}
          >
            {tripledItems.map((movie, idx) => (
              <motion.div
                key={`${movie.id}-${idx}`}
                className="relative cursor-pointer shrink-0 snap-start"
                data-observe={
                  idx === 0
                    ? "start"
                    : idx === tripledItems.length - 1
                    ? "end"
                    : undefined
                }
                whileHover={{
                  scale: 1.07,
                  transition: { type: "spring", stiffness: 300, damping: 20 },
                }}
                onClick={() => {
                  pause();
                  if (!isDragging.current) onSelect(movie);
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={() => {
                  if (!isDragging.current) onSelect(movie);
                  resume();
                }}
              >
                <div className="relative rounded-lg">
                  <img
                    src={
                      movie.poster_path
                        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                        : "/fallback.png"
                    }
                    alt={movie.title}
                    className="h-52 w-36 md:h-72 md:w-52 lg:h-80 lg:w-56 object-cover rounded-lg shadow pointer-events-none"
                    draggable={false}
                  />

                  {/* NEW Badge */}
                  {movie.isNew && (
                    <div
                      className="absolute top-2 left-2 bg-amber-400 shadow-[0_0_6px_#fbbf24,0_0_12px_#facc15] text-black text-[10px] md:text-xs px-1.5 py-0.5 rounded font-bold z-10"
                    >
                      NEW
                    </div>
                  )}

                  {/* Rating Badge */}
                  <div className="absolute bottom-2 right-2 bg-yellow-400 shadow-[0_0_6px_#fbbf24,0_0_12px_#facc15] text-black text-xs md:text-sm px-1.5 py-0.5 rounded font-semibold z-10">
                    {movie.vote_average?.toFixed(1) ?? "N/A"}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
