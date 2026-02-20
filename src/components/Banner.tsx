"use client";

import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { FaInfoCircle, FaPlay } from "react-icons/fa";
import { Bookmark } from "lucide-react";

import type { Movie } from "@/types/movie";
import { useWatchlist } from "@/context/WatchlistContext";
import { useContinueWatching } from "@/hooks/useContinueWatching";

/* -------------------------------------------------
   MOTION
-------------------------------------------------- */
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.06,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
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
  const { toggleWatchlist, isInWatchlist } = useWatchlist();
  const { getTVProgress } = useContinueWatching();

  const isTV = item.media_type === "tv";
  const isSaved = isInWatchlist(item.id);

  /* -------------------------------------------------
     Resume
  -------------------------------------------------- */
  const resume = isTV ? getTVProgress(item.id) : null;

  const hasResume =
    resume &&
    typeof resume.season === "number" &&
    typeof resume.episode === "number";

  /* -------------------------------------------------
     Handlers
  -------------------------------------------------- */
  const handlePlay = useCallback(() => {
    if (isTV) {
      navigate(
        `/watch/tv/${item.id}/${resume?.season ?? 1}/${resume?.episode ?? 1}`,
      );
    } else {
      navigate(`/watch/movie/${item.id}`);
    }
  }, [navigate, isTV, item.id, resume]);

  const handleInfo = useCallback(() => {
    onSelect(item);
  }, [onSelect, item]);

  const handleWatchlist = useCallback(() => {
    toggleWatchlist(item);
  }, [toggleWatchlist, item]);

  /* -------------------------------------------------
     UI
  -------------------------------------------------- */
  return (
    <div
      className="relative w-full h-full flex flex-col justify-end overflow-hidden
      bg-[hsl(var(--background))] shadow-2xl"
    >
      {/* BACKDROP */}
      <AnimatePresence initial={false}>
        <motion.img
          key={item.id}
          src={
            item.backdrop_path
              ? `https://image.tmdb.org/t/p/original${item.backdrop_path}`
              : "/fallback-bg.png"
          }
          alt=""
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: EASE_OUT }}
        />
      </AnimatePresence>

      {/* Gradient */}
      <div className="absolute inset-0 bg-linear-to-t from-black via-black/80 to-black/30 pointer-events-none" />

      {/* CONTENT */}
      <motion.div
        key={item.id}
        className="relative z-10 px-4 md:px-12 py-6 md:py-10 max-w-6xl mx-auto"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <motion.h2
            variants={itemVariants}
            className="font-extrabold mb-4 text-[clamp(1.9rem,4.5vw,3.1rem)] text-[hsl(var(--surface-foreground))]"
          >
            {item.title || item.name}
          </motion.h2>

          {item.overview && (
            <motion.p
              variants={itemVariants}
              className="max-w-4xl mb-8 text-[hsl(var(--surface-foreground)/0.85)] text-[clamp(1rem,1.2vw,1.25rem)]
              leading-relaxed line-clamp-5 md:line-clamp-6"
            >
              {item.overview}
            </motion.p>
          )}

          <motion.div
            variants={itemVariants}
            className="flex items-center gap-3"
          >
            {/* Play */}
            <motion.button
              onClick={handlePlay}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`relative inline-flex items-center justify-center gap-3 h-12
                ${hasResume ? "px-7" : "px-6"} rounded-full font-semibold shadow-lg shadow-black/40
                bg-[hsl(var(--foreground))] text-[hsl(var(--background))] focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-[hsl(var(--foreground))]`}
            >
              <span className="absolute inset-0 rounded-full ring-1 ring-white/15" />
              <FaPlay size={22} />
              {hasResume && <span>Resume</span>}
            </motion.button>

            {/* Info */}
            <button
              onClick={handleInfo}
              className="inline-flex items-center justify-center h-12 w-12 rounded-full
              bg-[hsl(var(--foreground))] text-[hsl(var(--background))] transition hover:scale-105 active:scale-95
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--foreground))]"
            >
              <FaInfoCircle size={22} />
            </button>

            {/* Watchlist */}
            <button
              onClick={handleWatchlist}
              aria-pressed={isSaved}
              className="inline-flex items-center justify-center h-12 w-12 rounded-full
               bg-[hsl(var(--foreground))] text-[hsl(var(--background))] transition hover:scale-105 active:scale-95
               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--foreground))]"
            >
              <Bookmark
                size={22}
                strokeWidth={isSaved ? 3 : 2}
                className={isSaved ? "fill-current" : "fill-none"}
              />
            </button>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
