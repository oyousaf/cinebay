import { useRef, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import React from "react";
import type { Movie } from "@/types/movie";
import Banner from "./Banner";
import { useNavigation } from "@/hooks/useNavigation";
import { Loader2 } from "lucide-react";
import { useVideoEmbed } from "@/hooks/useVideoEmbed";

interface ContentRailProps {
  title: string;
  items: Movie[];
  onSelect: (movie: Movie) => void;
  onWatch: (url: string) => void;
}

/* ---------- Tile ---------- */
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
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 20,
        mass: 0.9,
      }}
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
          className="
            absolute top-2 left-2
            bg-[hsl(var(--foreground))]
            text-[hsl(var(--background))]
            text-[10px] md:text-xs font-bold
            px-2 py-0.5 rounded-full uppercase
            shadow-md shadow-pulse
          "
        >
          {movie.status!.toUpperCase()}
        </div>
      )}
    </motion.button>
  );
});

/* ---------- ContentRail ---------- */
export default function ContentRail({
  title,
  items,
  onSelect,
  onWatch,
}: ContentRailProps) {
  const [activeItem, setActiveItem] = useState<Movie | null>(null);
  const tileRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const railRef = useRef<HTMLDivElement | null>(null);

  const { focus, setFocus, registerRail, updateRailLength } = useNavigation();
  const [railIndex, setRailIndex] = useState<number | null>(null);

  /* ---------- Embed resolution ---------- */
  const embedUrl = useVideoEmbed(
    activeItem?.id,
    activeItem?.media_type === "movie" || activeItem?.media_type === "tv"
      ? activeItem.media_type
      : undefined,
  );

  /* ---------- Register rail ---------- */
  useEffect(() => {
    if (railIndex === null) {
      const idx = registerRail(items.length);
      setRailIndex(idx);
    }
  }, [railIndex, registerRail, items.length]);

  const handleFocus = useCallback(
    (movie: Movie, idx: number) => {
      setActiveItem(movie);
      if (railIndex !== null) {
        setFocus({ section: railIndex, index: idx });
      }
    },
    [railIndex, setFocus],
  );

  /* ---------- Keep focused tile centered ---------- */
  useEffect(() => {
    if (railIndex === null) return;

    updateRailLength(railIndex, items.length);

    if (items.length > 0 && focus.section === railIndex) {
      const focusedMovie = items[focus.index];

      if (focusedMovie && focusedMovie.id !== activeItem?.id) {
        setActiveItem(focusedMovie);
      }

      const el = tileRefs.current[focus.index];
      const container = railRef.current;

      if (el && container) {
        const containerWidth = container.clientWidth;
        const rawScroll =
          el.offsetLeft - containerWidth / 2 + el.offsetWidth / 2;

        container.scrollTo({
          left: Math.max(0, rawScroll),
          behavior: "smooth",
        });
      }
    }
  }, [items, focus, railIndex, updateRailLength, activeItem]);

  /* ---------- Default first focus ---------- */
  useEffect(() => {
    if (!activeItem && items.length > 0 && focus.section !== railIndex) {
      setActiveItem(items[0]);
      if (railIndex !== null) {
        setFocus({ section: railIndex, index: 0 });
      }
    }
  }, [items, activeItem, railIndex, focus.section, setFocus]);

  /* ---------- Keyboard Navigation ---------- */
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (railIndex === null || focus.section !== railIndex) return;
      if (!activeItem) return;

      switch (e.key) {
        case "i":
        case "Info":
          e.preventDefault();
          onSelect(activeItem);
          break;

        case "Enter":
        case "Return":
        case "p":
        case "MediaPlayPause":
          e.preventDefault();
          if (embedUrl) onWatch(embedUrl);
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [railIndex, focus.section, activeItem, embedUrl, onSelect, onWatch]);

  /* ---------- Gamepad Support ---------- */
  useEffect(() => {
    let rafId: number;
    let pressedA = false;
    let pressedB = false;

    const pollGamepad = () => {
      const gamepads = navigator.getGamepads?.();
      if (!gamepads) return;

      const gp = gamepads[0];
      if (gp && activeItem) {
        const aPressed = gp.buttons[0]?.pressed;
        const bPressed = gp.buttons[1]?.pressed;

        if (aPressed && !pressedA) {
          pressedA = true;
          if (embedUrl) onWatch(embedUrl);
        } else if (!aPressed) pressedA = false;

        if (bPressed && !pressedB) {
          pressedB = true;
          onSelect(activeItem);
        } else if (!bPressed) pressedB = false;
      }

      rafId = requestAnimationFrame(pollGamepad);
    };

    const connect = () => pollGamepad();
    const disconnect = () => cancelAnimationFrame(rafId);

    window.addEventListener("gamepadconnected", connect);
    window.addEventListener("gamepaddisconnected", disconnect);

    return () => {
      window.removeEventListener("gamepadconnected", connect);
      window.removeEventListener("gamepaddisconnected", disconnect);
      cancelAnimationFrame(rafId);
    };
  }, [activeItem, embedUrl, onSelect, onWatch]);

  /* ---------- UI ---------- */
  return (
    <section className="relative w-full min-h-[90vh] sm:h-screen snap-start flex flex-col">
      <div className="flex-1">
        {!activeItem ? (
          <motion.div className="flex items-center justify-center h-full">
            <Loader2 className="animate-spin w-8 h-8 text-[hsl(var(--foreground))]" />
          </motion.div>
        ) : (
          <motion.div className="w-full h-full">
            <Banner item={activeItem} onSelect={onSelect} onWatch={onWatch} />
          </motion.div>
        )}
      </div>

      {items.length > 0 && railIndex !== null && (
        <motion.div
          key="tiles"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="relative z-50 px-4 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
        >
          <div
            ref={railRef}
            className="flex overflow-x-auto overflow-y-hidden gap-3 no-scrollbar snap-x snap-mandatory pl-2 md:pl-4 pr-2 md:pr-4 py-4"
            role="list"
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
