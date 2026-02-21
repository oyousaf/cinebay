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

  /* ---------------------------
     Micro-interactions
  ----------------------------*/

  const dropdownMotion: Variants = {
    hidden: { opacity: 0, y: -6 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.18, ease: "easeOut" },
    },
    exit: {
      opacity: 0,
      y: -4,
      transition: { duration: 0.12 },
    },
  };

  const micVariants: Variants = {
    idle: { scale: 1, opacity: 1 },
    listening: {
      scale: 1.05,
      opacity: 0.95,
      transition: {
        duration: 0.6,
        repeat: Infinity,
        repeatType: "reverse",
        ease: "easeInOut",
      },
    },
  };

  const hasContent = sb.showRecent || sb.showTrending || sb.showResults;

  /* ---------------------------
     Dropdown
  ----------------------------*/

  const dropdown =
    sb.mounted &&
    sb.portalRoot &&
    sb.pos &&
    sb.focused &&
    !sb.listening &&
    hasContent
      ? createPortal(
          <motion.div
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
              scrollbarGutter: "stable",
            }}
            className="max-h-96 overflow-y-auto rounded-lg shadow-lg bg-[hsl(var(--background))]
              border border-[hsl(var(--foreground)/0.15)]"
            onMouseDown={(e) => e.preventDefault()}
          >
            {/* ---------- RECENT HEADER ---------- */}
            {sb.showRecent && (
              <div className="flex justify-between items-center px-4 py-2 text-xs opacity-60">
                <span>Recent</span>
                <button
                  className="opacity-50 hover:opacity-100 transition-opacity"
                  onClick={sb.clearRecent}
                  type="button"
                >
                  Clear
                </button>
              </div>
            )}

            {/* ---------- RECENT ITEMS ---------- */}
            <AnimatePresence initial={false}>
              {sb.showRecent &&
                sb.recent.map((term) => (
                  <motion.div
                    key={term}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{
                      opacity: 0,
                      height: 0,
                      transition: {
                        duration: 0.25,
                        ease: "easeInOut",
                      },
                    }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="flex justify-between px-4 py-2 hover:bg-[hsl(var(--foreground)/0.08)]">
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
                        aria-label={`Remove ${term}`}
                      >
                        <FaTimes />
                      </button>
                    </div>
                  </motion.div>
                ))}
            </AnimatePresence>

            {/* ---------- TRENDING ---------- */}
            {sb.showTrending &&
              sb.trending.map((item) => (
                <div
                  key={item.id}
                  onClick={() => sb.handleSelect(item)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left cursor-pointer hover:bg-[hsl(var(--foreground)/0.08)]"
                >
                  <img
                    src={getSearchItemImage(item)}
                    className="w-10 h-14 object-cover rounded-sm"
                    alt=""
                  />
                  <div className="text-sm">{item.title || item.name}</div>
                </div>
              ))}

            {/* ---------- RESULTS ---------- */}
            {sb.showResults && (
              <AnimatePresence mode="wait">
                {sb.loading ? (
                  <motion.div
                    key="loader"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex justify-center py-6"
                  >
                    <Loader2 className="animate-spin opacity-60" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="results"
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    variants={{
                      hidden: {},
                      visible: {
                        transition: {
                          staggerChildren: 0.035,
                        },
                      },
                    }}
                  >
                    {sb.results.map((item) => (
                      <motion.div
                        key={`${item.media_type}:${item.id}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{
                          duration: 0.22,
                          ease: "easeOut",
                        }}
                        onClick={() => sb.handleSelect(item)}
                        className="w-full flex items-center gap-3 px-4 py-2 text-left cursor-pointer
              hover:bg-[hsl(var(--foreground)/0.08)]"
                      >
                        <img
                          src={getSearchItemImage(item)}
                          className="w-10 h-14 object-cover rounded-sm"
                          alt=""
                        />
                        <div className="text-sm">{item.title || item.name}</div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </motion.div>,
          sb.portalRoot,
        )
      : null;

  /* ---------------------------
     Component
  ----------------------------*/

  return (
    <>
      <div className="w-full flex justify-center">
        <div ref={sb.containerRef} className="w-full max-w-3xl mx-auto">
          <form
            ref={sb.formRef}
            onSubmit={sb.submit}
            className="flex items-center gap-3 px-4 py-2 rounded-xl bg-[hsl(var(--background))]
              border border-[hsl(var(--foreground)/0.25)] shadow-md"
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
              className="flex-1 bg-transparent outline-none text-xl h-12"
            />

            {sb.query && (
              <button
                type="button"
                onClick={sb.clearQuery}
                className="opacity-60 hover:opacity-100 transition-opacity"
              >
                <FaTimes />
              </button>
            )}

            <motion.button
              type="button"
              onClick={sb.startVoice}
              variants={micVariants}
              animate={sb.listening ? "listening" : "idle"}
              className="relative flex items-center justify-center"
            >
              {/* Flash pulse */}
              <AnimatePresence>
                {sb.listening && (
                  <motion.span
                    className="absolute inset-0 rounded-full bg-red-500/30"
                    initial={{ scale: 0.6, opacity: 0.5 }}
                    animate={{ scale: 1.6, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      ease: "easeOut",
                    }}
                  />
                )}
              </AnimatePresence>

              <span
                className={`relative z-10 ${
                  sb.listening ? "text-red-500" : ""
                }`}
              >
                {sb.listening ? <MicOff /> : <Mic />}
              </span>
            </motion.button>

            <button type="submit">
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
