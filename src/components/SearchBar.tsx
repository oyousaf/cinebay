// SearchBar.tsx
"use client";

import { memo } from "react";
import { createPortal } from "react-dom";
import { motion, type Variants } from "framer-motion";
import { Search, Loader2, Mic, MicOff } from "lucide-react";
import { FaTimes } from "react-icons/fa";

import type { Movie } from "@/types/movie";
import { getSearchItemImage, useSearchBar } from "@/hooks/useSearchBar";

function SearchBar({
  onSelectMovie,
  onSelectPerson,
}: {
  onSelectMovie: (movie: Movie) => void;
  onSelectPerson?: (person: Movie) => void;
}) {
  const sb = useSearchBar({ onSelectMovie, onSelectPerson });

  /* ---------- ANIMATION ---------- */
  const micPulse: Variants = {
    idle: { opacity: 1 },
    listening: {
      opacity: 0.85,
      transition: {
        duration: 0.9,
        ease: "easeInOut",
        repeat: Infinity,
        repeatType: "reverse",
      },
    },
  };

  /* ---------- DROPDOWN ---------- */
  const dropdown =
    sb.mounted && sb.portalRoot && sb.pos && sb.focused && !sb.listening
      ? createPortal(
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              position: "fixed",
              left: sb.pos.left,
              top: sb.pos.top,
              width: sb.pos.width,
              zIndex: 40,
            }}
            className="max-h-96 overflow-y-auto rounded-lg shadow-lg bg-[hsl(var(--background))] border border-[hsl(var(--foreground)/0.15)]"
            onMouseDown={(e) => {
              e.preventDefault();
            }}
          >
            {sb.showRecent && (
              <>
                <div className="flex justify-between items-center px-4 py-2 text-xs opacity-60">
                  <span>Recent</span>
                  <button
                    className="opacity-50 hover:opacity-100 cursor-pointer"
                    onClick={sb.clearRecent}
                    type="button"
                  >
                    Clear
                  </button>
                </div>

                {sb.recent.map((term) => (
                  <div
                    key={term}
                    className="flex justify-between px-4 py-2 hover:bg-[hsl(var(--foreground)/0.08)]"
                  >
                    <button
                      type="button"
                      className="flex-1 text-left cursor-pointer"
                      onClick={() => sb.setQuery(term)}
                    >
                      {term}
                    </button>

                    <button
                      type="button"
                      className="opacity-50 hover:opacity-100 cursor-pointer"
                      onClick={() => sb.removeRecent(term)}
                      aria-label={`Remove ${term} from recent searches`}
                      title="Remove"
                    >
                      <FaTimes />
                    </button>
                  </div>
                ))}
              </>
            )}

            {sb.showTrending &&
              sb.trending.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => sb.handleSelect(item)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left cursor-pointer hover:bg-[hsl(var(--foreground)/0.08)]"
                >
                  <img
                    src={getSearchItemImage(item)}
                    className="w-10 h-14 object-cover"
                    alt=""
                  />
                  <div className="text-sm">{item.title || item.name}</div>
                </button>
              ))}

            {sb.showResults &&
              (sb.loading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="animate-spin opacity-60" />
                </div>
              ) : (
                sb.results.map((item) => (
                  <button
                    type="button"
                    key={`${item.media_type}:${item.id}`}
                    onClick={() => sb.handleSelect(item)}
                    className="w-full flex items-center gap-3 px-4 py-2 text-left cursor-pointer hover:bg-[hsl(var(--foreground)/0.08)]"
                  >
                    <img
                      src={getSearchItemImage(item)}
                      className="w-10 h-14 object-cover"
                      alt=""
                    />
                    <div className="text-sm">{item.title || item.name}</div>
                  </button>
                ))
              ))}
          </motion.div>,
          sb.portalRoot,
        )
      : null;

  return (
    <>
      <div className="w-full flex justify-center">
        <div ref={sb.containerRef} className="w-full max-w-3xl mx-auto">
          <form
            ref={sb.formRef}
            onSubmit={sb.submit}
            className="flex items-center gap-3 px-4 py-2 rounded-xl bg-[hsl(var(--background))] border border-[hsl(var(--foreground)/0.25)] shadow-md"
          >
            <input
              ref={sb.inputRef}
              value={sb.query}
              onChange={(e) => sb.setQuery(e.target.value)}
              onFocus={sb.onFocus}
              onBlur={sb.onBlur}
              placeholder={
                sb.listening ? "Listening…" : "Search movies, shows, people…"
              }
              className="flex-1 bg-transparent outline-none text-xl h-12 text-[hsl(var(--foreground))]
                placeholder:text-[hsl(var(--foreground)/0.55)] dark:placeholder:text-[hsl(var(--foreground)/0.65)]
              "
            />

            {sb.query && (
              <button
                type="button"
                onClick={sb.clearQuery}
                aria-label="Clear search"
              >
                <FaTimes />
              </button>
            )}

            <motion.button
              type="button"
              onClick={sb.startVoice}
              variants={micPulse}
              animate={sb.listening ? "listening" : "idle"}
              className={`relative flex items-center justify-center ${
                sb.listening ? "text-red-500" : ""
              }`}
              aria-label={
                sb.listening ? "Stop voice search" : "Start voice search"
              }
              title={sb.listening ? "Stop" : "Voice"}
            >
              {sb.listening && (
                <motion.span
                  className="absolute inset-0 rounded-full bg-red-500/20"
                  initial={{ scale: 0.8, opacity: 0.4 }}
                  animate={{ scale: 1.6, opacity: 0 }}
                  transition={{
                    duration: 1.4,
                    ease: "easeOut",
                    repeat: Infinity,
                  }}
                />
              )}
              <span className="relative z-10">
                {sb.listening ? <MicOff /> : <Mic />}
              </span>
            </motion.button>

            <button type="submit" aria-label="Search">
              {sb.loading ? <Loader2 className="animate-spin" /> : <Search />}
            </button>
          </form>
        </div>
      </div>

      {dropdown}
    </>
  );
}

export default memo(SearchBar);
