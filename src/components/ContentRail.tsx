"use client";

import { useRef, useEffect, useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import React from "react";

import type { Movie } from "@/types/movie";
import Banner from "./Banner";
import { useNavigation } from "@/context/NavigationContext";
import { useWatchlist } from "@/context/WatchlistContext";

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
        ${
          isFocused
            ? "ring-4 2xl:ring-[6px] ring-[#80ffcc] shadow-pulse z-50"
            : "z-10"
        }`}
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

  const [railIndex, setRailIndex] = useState<number | null>(null);

  const {
    focus,
    setFocusByIndex,
    registerRail,
    updateRailLength,
    activeTab,
    setSelectHandler,
    setPlayHandler,
    setToggleHandler,
  } = useNavigation();

  const { toggleWatchlist } = useWatchlist();

  /* ---------- reset rail on tab change ---------- */

  useEffect(() => {
    setRailIndex(null);
  }, [activeTab]);

  /* ---------- keep refs aligned ---------- */

  useEffect(() => {
    tileRefs.current = tileRefs.current.slice(0, items.length);
  }, [items.length]);

  /* ---------- register rail ---------- */

  useEffect(() => {
    if (!items.length) {
      setRailIndex(null);
      return;
    }

    setRailIndex((prev) => {
      if (prev === null) return registerRail(items.length);
      updateRailLength(prev, items.length);
      return prev;
    });
  }, [items.length, registerRail, updateRailLength]);

  /* ---------- RESTORE FOCUS AFTER PLAYER ---------- */

  useEffect(() => {
    if (railIndex === null) return;

    const last = sessionStorage.getItem("lastFocusedTile");
    if (!last) return;

    const idx = items.findIndex((m) => String(m.id) === last);

    if (idx >= 0) {
      setFocusByIndex(railIndex, idx);

      requestAnimationFrame(() => {
        const el = tileRefs.current[idx];
        if (el) el.focus({ preventScroll: true });
      });
    }

    sessionStorage.removeItem("lastFocusedTile");
  }, [items, railIndex, setFocusByIndex]);

  /* ---------- clamp focus ---------- */

  useEffect(() => {
    if (railIndex === null || !items.length) return;
    if (focus.section !== railIndex) return;

    const safeIndex = Math.min(Math.max(focus.index, 0), items.length - 1);

    if (safeIndex !== focus.index) {
      setFocusByIndex(railIndex, safeIndex);
    }
  }, [railIndex, items.length, focus.section, focus.index, setFocusByIndex]);

  /* ---------- ensure first rail focus ---------- */

  useEffect(() => {
    if (railIndex === null || !items.length) return;

    if (railIndex === 0 && focus.section !== 0) {
      setFocusByIndex(0, 0);
    }
  }, [railIndex, items.length, focus.section, setFocusByIndex]);

  /* ---------- active item ---------- */

  const safeIndex = useMemo(() => {
    if (!items.length || railIndex === null) return 0;
    if (focus.section !== railIndex) return 0;

    return Math.min(Math.max(focus.index, 0), items.length - 1);
  }, [items.length, railIndex, focus.section, focus.index]);

  const activeItem = items[safeIndex] ?? items[0];

  /* ---------- controller bindings (SAFE) ---------- */

  useEffect(() => {
    if (!activeItem) return;

    setSelectHandler(() => {
      onSelect(activeItem);
    });

    setPlayHandler(() => {
      sessionStorage.setItem("lastFocusedTile", String(activeItem.id));

      if (activeItem.media_type === "tv") {
        window.location.href = `/watch/tv/${activeItem.id}/1/1`;
      } else {
        window.location.href = `/watch/movie/${activeItem.id}`;
      }
    });

    setToggleHandler(() => {
      toggleWatchlist(activeItem);
    });

    return () => {
      setSelectHandler(null);
      setPlayHandler(null);
      setToggleHandler(null);
    };
  }, [activeItem, onSelect, toggleWatchlist]);

  /* ---------- focus handler ---------- */

  const handleFocus = useCallback(
    (_movie: Movie, idx: number) => {
      if (railIndex !== null) {
        setFocusByIndex(railIndex, idx);
      }
    },
    [railIndex, setFocusByIndex],
  );

  /* ---------- scroll ---------- */

  useEffect(() => {
    if (railIndex === null || focus.section !== railIndex) return;

    const el = tileRefs.current[safeIndex];
    const container = railRef.current;

    if (!el || !container) return;

    const target =
      el.offsetLeft - container.clientWidth / 2 + el.offsetWidth / 2;

    container.scrollTo({
      left: Math.max(0, target),
      behavior: "smooth",
    });
  }, [focus.section, safeIndex, railIndex]);

  /* ---------- DOM focus ---------- */

  useEffect(() => {
    if (railIndex === null || focus.section !== railIndex) return;

    const el = tileRefs.current[safeIndex];

    if (el && document.activeElement !== el) {
      requestAnimationFrame(() => el.focus({ preventScroll: true }));
    }
  }, [focus.section, safeIndex, railIndex]);

  if (!items.length) return null;

  return (
    <section className="relative w-full h-dvh flex flex-col pb-16 md:pb-0">
      <div className="flex-7">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, ease: EASE_OUT }}
          className="w-full h-full"
        >
          <Banner item={activeItem} onSelect={onSelect} />
        </motion.div>
      </div>

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
                isFocused={focus.section === railIndex && safeIndex === idx}
                onFocus={() => handleFocus(movie, idx)}
                refSetter={(el) => {
                  tileRefs.current[idx] = el;
                }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </section>
  );
}
