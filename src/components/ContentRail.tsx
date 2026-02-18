"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import React from "react";

import type { Movie } from "@/types/movie";
import Banner from "./Banner";
import { useNavigation } from "@/context/NavigationContext";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

interface ContentRailProps {
  items: Movie[];
  onSelect: (movie: Movie) => void;
}

/* ---------- TILE ---------- */
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
          bg-[hsl(var(--foreground))] text-[hsl(var(--background))] shadow-md"
        >
          {movie.status!.toUpperCase()}
        </div>
      )}
    </motion.button>
  );
});

/* ---------- CONTENT RAIL ---------- */
export default function ContentRail({ items, onSelect }: ContentRailProps) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const tileRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const railIndexRef = useRef<number | null>(null);

  const { focus, setFocusById, registerRail, updateRailLength, activeTab } =
    useNavigation();

  const [activeItem, setActiveItem] = useState<Movie | null>(null);

  /* Reset rail when tab changes */
  useEffect(() => {
    railIndexRef.current = null;
  }, [activeTab]);

  /* Register rail */
  useEffect(() => {
    if (!items.length) {
      railIndexRef.current = null;
      return;
    }

    if (railIndexRef.current === null) {
      railIndexRef.current = registerRail(items.length);
    } else {
      updateRailLength(railIndexRef.current, items.length);
    }
  }, [items.length, registerRail, updateRailLength]);

  const railIndex = railIndexRef.current;

  /* Default focus (first load only) */
  useEffect(() => {
    if (railIndex === null || !items.length) return;

    if (focus.id === undefined && railIndex === 0) {
      const first = items[0];
      setActiveItem(first);
      setFocusById(railIndex, 0, first.id);
    }
  }, [railIndex, items, focus.id, setFocusById]);

  /* Recover focus by ID */
  useEffect(() => {
    if (railIndex === null || !items.length) return;
    if (focus.id === undefined) return;
    if (focus.section === railIndex) return;

    const idx = items.findIndex((m) => m.id === focus.id);
    if (idx !== -1) {
      setFocusById(railIndex, idx, focus.id);
    }
  }, [railIndex, items, focus.id, focus.section, setFocusById]);

  /* User interaction */
  const handleFocus = useCallback(
    (movie: Movie, idx: number) => {
      setActiveItem(movie);
      if (railIndex !== null) {
        setFocusById(railIndex, idx, movie.id);
      }
    },
    [railIndex, setFocusById],
  );

  /* Sync focus → scroll + banner */
  useEffect(() => {
    if (railIndex === null || focus.section !== railIndex || !items.length)
      return;

    let index = focus.index;

    if (focus.id !== undefined) {
      const found = items.findIndex((m) => m.id === focus.id);
      if (found !== -1) index = found;
    }

    index = Math.min(index, items.length - 1);

    const movie = items[index];
    setActiveItem(movie);

    const el = tileRefs.current[index];
    const container = railRef.current;

    if (el && container) {
      const target =
        el.offsetLeft - container.clientWidth / 2 + el.offsetWidth / 2;

      container.scrollTo({
        left: Math.max(0, target),
        behavior: "smooth",
      });
    }
  }, [focus, items, railIndex]);

  /* DOM focus */
  useEffect(() => {
    if (railIndex === null || focus.section !== railIndex) return;

    const el = tileRefs.current[focus.index];
    if (el && document.activeElement !== el) {
      requestAnimationFrame(() => el.focus({ preventScroll: true }));
    }
  }, [focus.section, focus.index, railIndex]);

  if (!items.length) return null;

  return (
    <section className="relative w-full min-h-[90vh] sm:h-screen flex flex-col">
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
            className="flex gap-3 2xl:gap-6 overflow-x-auto snap-x no-scrollbar
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
