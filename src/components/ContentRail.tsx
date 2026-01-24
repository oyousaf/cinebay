"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import React from "react";

import type { Movie } from "@/types/movie";
import Banner from "./Banner";
import { useNavigation } from "@/hooks/useNavigation";

/* -------------------------------------------------
   MOTION PRESET
-------------------------------------------------- */
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/* -------------------------------------------------
   TYPES
-------------------------------------------------- */
interface ContentRailProps {
  title: string;
  items: Movie[];
  onSelect: (movie: Movie) => void;
}

/* -------------------------------------------------
   TILE
-------------------------------------------------- */
const Tile = React.memo(function Tile({
  movie,
  isFocused,
  onFocus,
  refSetter,
}: {
  movie: Movie;
  isFocused: boolean;
  onFocus: () => void;
  refSetter: (el: HTMLButtonElement | null) => void;
}) {
  const showStatus = movie.status === "new" || movie.status === "renewed";

  return (
    <motion.button
      ref={refSetter}
      aria-label={movie.title || movie.name}
      aria-selected={isFocused}
      role="listitem"
      className={`relative shrink-0 rounded-lg focus:outline-none snap-center
        ${isFocused ? "ring-4 ring-[#80ffcc] shadow-pulse z-40" : "z-10"}`}
      animate={
        isFocused ? { scale: 1.1, opacity: 1 } : { scale: 1, opacity: 0.7 }
      }
      whileHover={!isFocused ? { scale: 1.03, opacity: 0.9 } : {}}
      transition={{ type: "spring", stiffness: 300, damping: 20, mass: 0.9 }}
      onClick={onFocus}
    >
      <img
        src={
          movie.poster_path
            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
            : "/fallback.png"
        }
        alt={movie.title || movie.name}
        className="h-44 w-32 lg:h-56 lg:w-40 object-cover rounded-lg shadow-md"
        loading="lazy"
      />

      {showStatus && (
        <div
          className="absolute top-2 left-2 bg-[hsl(var(--foreground))]
          text-[hsl(var(--background))] text-[10px] md:text-xs font-bold
          px-2 py-0.5 rounded-full uppercase shadow-md shadow-pulse"
        >
          {movie.status!.toUpperCase()}
        </div>
      )}
    </motion.button>
  );
});

/* -------------------------------------------------
   CONTENT RAIL
-------------------------------------------------- */
export default function ContentRail({
  title,
  items,
  onSelect,
}: ContentRailProps) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const tileRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const { focus, setFocus, registerRail, updateRailLength } = useNavigation();
  const [railIndex, setRailIndex] = useState<number | null>(null);

  const [activeItem, setActiveItem] = useState<Movie | null>(null);

  /* ---------- Register rail ---------- */
  useEffect(() => {
    if (railIndex === null) {
      setRailIndex(registerRail(items.length));
    }
  }, [railIndex, registerRail, items.length]);

  /* ---------- Focus handler ---------- */
  const handleFocus = useCallback(
    (movie: Movie, idx: number) => {
      setActiveItem(movie);
      if (railIndex !== null) {
        setFocus({ section: railIndex, index: idx });
      }
    },
    [railIndex, setFocus],
  );

  /* ---------- Sync focus + scroll ---------- */
  useEffect(() => {
    if (railIndex === null) return;

    updateRailLength(railIndex, items.length);
    if (focus.section !== railIndex) return;

    const focused = items[focus.index];
    if (focused && focused.id !== activeItem?.id) {
      setActiveItem(focused);
    }

    const el = tileRefs.current[focus.index];
    const container = railRef.current;

    if (el && container) {
      const target =
        el.offsetLeft - container.clientWidth / 2 + el.offsetWidth / 2;

      container.scrollTo({
        left: Math.max(0, target),
        behavior: "smooth",
      });
    }
  }, [focus, items, railIndex, updateRailLength, activeItem]);

  /* ---------- Default focus ---------- */
  useEffect(() => {
    if (!activeItem && items.length > 0 && railIndex !== null) {
      setActiveItem(items[0]);
      setFocus({ section: railIndex, index: 0 });
    }
  }, [items, activeItem, railIndex, setFocus]);

  if (items.length === 0) return null;

  /* -------------------------------------------------
     UI
  -------------------------------------------------- */
  return (
    <section className="relative w-full min-h-[90vh] sm:h-screen snap-start flex flex-col">
      {/* Banner */}
      <div className="flex-1">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: EASE_OUT }}
          className="w-full h-full"
        >
          <Banner item={activeItem ?? items[0]} onSelect={onSelect} />
        </motion.div>
      </div>

      {/* Rail */}
      {railIndex !== null && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25, ease: EASE_OUT }}
          className="relative z-50 px-4 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
        >
          <div
            ref={railRef}
            role="list"
            className="flex overflow-x-auto overflow-y-hidden gap-3
              no-scrollbar snap-x snap-mandatory
              pl-2 md:pl-4 pr-2 md:pr-4 py-4"
          >
            {items.map((movie, idx) => (
              <Tile
                key={movie.id}
                movie={movie}
                isFocused={focus.section === railIndex && focus.index === idx}
                onFocus={() => handleFocus(movie, idx)}
                refSetter={(el) => (tileRefs.current[idx] = el)}
              />
            ))}
          </div>
        </motion.div>
      )}
    </section>
  );
}
