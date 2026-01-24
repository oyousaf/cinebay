"use client";

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { FaInfoCircle, FaPlay } from "react-icons/fa";
import { Bookmark } from "lucide-react";

import type { Movie } from "@/types/movie";
import { useWatchlist } from "@/context/WatchlistContext";
import { useContinueWatching } from "@/hooks/useContinueWatching";

/* -------------------------------------------------
   MOTION PRESETS (SHARED FEEL)
-------------------------------------------------- */
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.08,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: EASE_OUT,
    },
  },
};

/* -------------------------------------------------
   COMPONENT
-------------------------------------------------- */
interface BannerProps {
  item: Movie;
  onSelect: (movie: Movie) => void;
}

export default function Banner({ item, onSelect }: BannerProps) {
  const navigate = useNavigate();
  const isTV = item.media_type === "tv";

  const { toggleWatchlist, isInWatchlist } = useWatchlist();
  const isSaved = isInWatchlist(item.id);

  const { getTVProgress } = useContinueWatching();

  /* ---------- RESUME ---------- */
  const resume = useMemo(() => {
    if (!isTV) return null;
    return getTVProgress(item.id);
  }, [isTV, item.id, getTVProgress]);

  const hasResume =
    Boolean(resume) &&
    typeof resume?.season === "number" &&
    typeof resume?.episode === "number";

  /* ---------- PLAY ---------- */
  const handlePlay = () => {
    if (isTV) {
      navigate(
        `/watch/tv/${item.id}/${resume?.season ?? 1}/${resume?.episode ?? 1}`,
      );
    } else {
      navigate(`/watch/movie/${item.id}`);
    }
  };

  /* -------------------------------------------------
     UI
  -------------------------------------------------- */
  return (
    <div className="relative w-full h-[70vh] sm:h-full flex flex-col justify-end overflow-hidden bg-black shadow-2xl snap-start">
      {/* Background (cinematic fade) */}
      <AnimatePresence initial={false}>
        <motion.img
          key={item.id}
          src={
            item.backdrop_path
              ? `https://image.tmdb.org/t/p/original${item.backdrop_path}`
              : "/fallback-bg.png"
          }
          alt=""
          className="absolute inset-0 w-full h-full object-cover will-change-transform"
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: EASE_OUT }}
        />
      </AnimatePresence>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-linear-to-t from-black via-black/80 to-black/30 pointer-events-none" />

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={item.id}
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="relative z-10 px-4 md:px-12 py-6 md:py-10 max-w-6xl mx-auto"
        >
          <motion.h2
            variants={itemVariants}
            className="font-extrabold mb-4 text-[clamp(1.9rem,4.5vw,3.1rem)]"
          >
            {item.title || item.name}
          </motion.h2>

          {item.overview && (
            <motion.p
              variants={itemVariants}
              className="text-gray-200 max-w-4xl mb-8
                text-[clamp(1rem,1.2vw,1.25rem)]
                leading-relaxed
                line-clamp-5 md:line-clamp-6"
            >
              {item.overview}
            </motion.p>
          )}

          <motion.div
            variants={itemVariants}
            className="flex items-center gap-3"
          >
            {/* PLAY */}
            <motion.button
              onClick={handlePlay}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
              className={`
                relative inline-flex items-center justify-center gap-3 h-12
                ${hasResume ? "px-7" : "px-6"}
                rounded-full font-semibold leading-none
                select-none shadow-lg shadow-black/40
                bg-[hsl(var(--foreground))]
                text-[hsl(var(--background))]
              `}
            >
              <span className="absolute inset-0 rounded-full ring-1 ring-white/15 pointer-events-none" />
              <FaPlay size={22} />
              {hasResume && <span>Resume</span>}
            </motion.button>

            {/* INFO */}
            <button
              onClick={() => onSelect(item)}
              aria-label="More information"
              className="inline-flex items-center justify-center h-12 w-12 rounded-full
                bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
            >
              <FaInfoCircle size={22} />
            </button>

            {/* WATCHLIST */}
            <button
              onClick={() => toggleWatchlist(item)}
              aria-pressed={isSaved}
              aria-label="Toggle watchlist"
              className="inline-flex items-center justify-center h-12 w-12 rounded-full
                bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
            >
              <Bookmark
                size={22}
                strokeWidth={isSaved ? 3 : 2}
                className={isSaved ? "fill-current" : "fill-none"}
              />
            </button>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
