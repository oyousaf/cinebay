"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import React from "react";

import type { Movie } from "@/types/movie";
import Banner from "./Banner";
import { useNavigation } from "@/hooks/useNavigation";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

interface ContentRailProps {
  items: Movie[];
  onSelect: (movie: Movie) => void;
}

/* TILE */
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
      tabIndex={isFocused ? 0 : -1}
      onKeyDown={(e) => {
        if (e.key === "Enter") onFocus();
      }}
      aria-selected={isFocused}
      role="listitem"
      onClick={onFocus}
      className={`relative shrink-0 rounded-lg snap-center focus:outline-none
        ${isFocused ? "ring-4 2xl:ring-[6px] ring-[#80ffcc] shadow-pulse z-60" : "z-40"}`}
      animate={
        isFocused ? { scale: 1.1, opacity: 1 } : { scale: 1, opacity: 0.7 }
      }
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
    >
      <img
        src={
          movie.poster_path
            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
            : "/fallback.png"
        }
        alt={movie.title || movie.name}
        loading="lazy"
        draggable={false}
        className="h-44 w-32 lg:h-56 lg:w-40 2xl:h-72 2xl:w-52 object-cover rounded-lg shadow-md"
      />

      {showStatus && (
        <div
          className="absolute top-2 left-2 rounded-full px-2 py-0.5
          text-[10px] md:text-xs font-bold uppercase
          bg-[hsl(var(--foreground))] text-[hsl(var(--background))]
          shadow-md"
        >
          {movie.status!.toUpperCase()}
        </div>
      )}
    </motion.button>
  );
});

/* CONTENT RAIL */
export default function ContentRail({ items, onSelect }: ContentRailProps) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const tileRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const lastFocusRef = useRef(0);

  const { focus, setFocus, registerRail, updateRailLength } = useNavigation();
  const [railIndex, setRailIndex] = useState<number | null>(null);
  const [activeItem, setActiveItem] = useState<Movie | null>(null);

  /* Register rail */
  useEffect(() => {
    if (railIndex === null && items.length > 0) {
      setRailIndex(registerRail(items.length));
    }
  }, [railIndex, registerRail, items.length]);

  /* Focus handler */
  const handleFocus = useCallback(
    (movie: Movie, idx: number) => {
      lastFocusRef.current = idx;
      setActiveItem(movie);
      if (railIndex !== null) {
        setFocus({ section: railIndex, index: idx });
      }
    },
    [railIndex, setFocus],
  );

  /* Sync focus + scroll */
  useEffect(() => {
    if (railIndex === null) return;

    updateRailLength(railIndex, items.length);
    if (focus.section !== railIndex) return;

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
  }, [focus, items, railIndex, updateRailLength]);

  /* Restore last focus */
  useEffect(() => {
    if (items.length > 0 && railIndex !== null) {
      const index = Math.min(lastFocusRef.current, items.length - 1);
      setActiveItem(items[index]);
      setFocus({ section: railIndex, index });
    }
  }, [items, railIndex, setFocus]);

  if (items.length === 0) return null;

  return (
    <section className="relative w-full min-h-[90vh] sm:h-screen snap-start flex flex-col">
      {/* Banner */}
      <div className="flex-1">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, ease: EASE_OUT }}
          className="w-full h-full"
        >
          <Banner item={activeItem ?? items[0]} onSelect={onSelect} />
        </motion.div>
      </div>

      {/* Rail */}
      {railIndex !== null && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2, ease: EASE_OUT }}
          className="relative z-50 px-4 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
        >
          <div
            ref={railRef}
            role="list"
            className="flex gap-3 2xl:gap-6 overflow-x-auto overflow-y-hidden snap-x snap-proximity no-scrollbar
              pl-2 md:pl-4 pr-2 md:pr-4 py-4 scroll-smooth"
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
