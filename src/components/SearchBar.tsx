"use client";

import { memo } from "react";
import { createPortal } from "react-dom";
import { motion, type Variants, AnimatePresence } from "framer-motion";
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

  const dropdownMotion: Variants = {
    hidden: { opacity: 0, y: -8, scale: 0.995 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.18, ease: "easeOut" },
    },
    exit: {
      opacity: 0,
      y: -6,
      transition: { duration: 0.12 },
    },
  };

  const listItemMotion: Variants = {
    initial: { opacity: 0, y: -6, height: 0 },
    animate: {
      opacity: 1,
      y: 0,
      height: "auto",
      transition: { duration: 0.22, ease: "easeOut" },
    },
    exit: {
      opacity: 0,
      y: -4,
      height: 0,
      transition: { duration: 0.18, ease: "easeInOut" },
    },
  };

  const rowInteraction = {
    whileHover: { backgroundColor: "rgba(255,255,255,0.04)" },
    whileTap: { scale: 0.995 },
  };

  /* ---------- DROPDOWN ---------- */

  const hasContent = sb.showRecent || sb.showTrending || sb.showResults;

  const dropdown =
    sb.mounted &&
    sb.portalRoot &&
    sb.pos &&
    sb.focused &&
    !sb.listening &&
    hasContent
      ? createPortal(
          <AnimatePresence>
            <motion.div
              key="dropdown"
              variants={dropdownMotion}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{
                position: "fixed",
                left: sb.pos.left,
                top: sb.pos.top,
                width: sb.pos.width,
                zIndex: 40,
              }}
              className="max-h-96 overflow-y-auto rounded-lg shadow-lg bg-[hsl(var(--background))]
                border border-[hsl(var(--foreground)/0.15)]"
              onMouseDown={(e) => e.preventDefault()}
              layout
            >
              {/* ---------- RECENT ---------- */}
              {sb.showRecent && (
                <>
                  <div className="flex justify-between items-center px-4 py-2 text-xs opacity-60">
                    <span>Recent</span>
                    <button
                      className="opacity-50 hover:opacity-100 cursor-pointer transition-opacity"
                      onClick={sb.clearRecent}
                      type="button"
                    >
                      Clear
                    </button>
                  </div>

                  <AnimatePresence initial={false}>
                    {sb.recent.map((term) => (
                      <motion.div
                        key={term}
                        variants={listItemMotion}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        layout
                        className="overflow-hidden"
                      >
                        <motion.div
                          {...rowInteraction}
                          className="flex justify-between px-4 py-2 cursor-pointer"
                        >
                          <button
                            type="button"
                            className="flex-1 text-left"
                            onClick={() => sb.setQuery(term)}
                          >
                            {term}
                          </button>

                          <button
                            type="button"
                            className="opacity-50 hover:opacity-100 transition-opacity"
                            onClick={() => sb.removeRecent(term)}
                            aria-label={`Remove ${term} from recent searches`}
                          >
                            <FaTimes />
                          </button>
                        </motion.div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </>
              )}

              {/* ---------- TRENDING ---------- */}
              {sb.showTrending &&
                sb.trending.map((item) => (
                  <motion.button
                    layout
                    key={item.id}
                    onClick={() => sb.handleSelect(item)}
                    className="w-full flex items-center gap-3 px-4 py-2 text-left"
                    {...rowInteraction}
                  >
                    <img
                      src={getSearchItemImage(item)}
                      className="w-10 h-14 object-cover rounded-sm"
                      alt=""
                    />
                    <div className="text-sm">{item.title || item.name}</div>
                  </motion.button>
                ))}

              {/* ---------- RESULTS ---------- */}
              {sb.showResults &&
                (sb.loading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="animate-spin opacity-60" />
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {sb.results.map((item) => (
                      <motion.button
                        key={`${item.media_type}:${item.id}`}
                        layout
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        onClick={() => sb.handleSelect(item)}
                        className="w-full flex items-center gap-3 px-4 py-2 text-left"
                        {...rowInteraction}
                      >
                        <img
                          src={getSearchItemImage(item)}
                          className="w-10 h-14 object-cover rounded-sm"
                          alt=""
                        />
                        <div className="text-sm">{item.title || item.name}</div>
                      </motion.button>
                    ))}
                  </AnimatePresence>
                ))}
            </motion.div>
          </AnimatePresence>,
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
            className="flex items-center gap-3 px-4 py-2 rounded-xl bg-[hsl(var(--background))]
             border border-[hsl(var(--foreground)/0.25)] shadow-md transition-shadow duration-200
              focus-within:shadow-lg"
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
                placeholder:text-[hsl(var(--foreground)/0.55)]"
            />

            {sb.query && (
              <motion.button
                type="button"
                onClick={sb.clearQuery}
                aria-label="Clear search"
                whileTap={{ scale: 0.9 }}
                className="opacity-60 hover:opacity-100 transition-opacity"
              >
                <FaTimes />
              </motion.button>
            )}

            <motion.button
              type="button"
              onClick={sb.startVoice}
              variants={micPulse}
              animate={sb.listening ? "listening" : "idle"}
              whileTap={{ scale: 0.9 }}
              className={`relative flex items-center justify-center ${
                sb.listening ? "text-red-500" : ""
              }`}
              aria-label={
                sb.listening ? "Stop voice search" : "Start voice search"
              }
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

            <motion.button
              type="submit"
              aria-label="Search"
              whileTap={{ scale: 0.9 }}
            >
              {sb.loading ? <Loader2 className="animate-spin" /> : <Search />}
            </motion.button>
          </form>
        </div>
      </div>

      {dropdown}
    </>
  );
}

export default memo(SearchBar);
