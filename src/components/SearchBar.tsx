import { useState, useRef, useCallback, useEffect } from "react";
import { motion, useAnimation } from "framer-motion";
import { Search } from "lucide-react";
import debounce from "lodash.debounce";

import { fetchDetails, fetchFromProxy } from "@/lib/tmdb";
import type { Movie } from "@/types/movie";

import React from "react";

const SearchBar: React.FC<{
  onSelectMovie: (movie: Movie) => void;
  onSelectPerson?: (person: Movie) => void;
}> = React.memo(({ onSelectMovie, onSelectPerson }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TMDBResult[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const iconControls = useAnimation();
  const resultsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 🔹 Autofocus when mounted
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 🔹 Debounced TMDB search
  const debouncedSearch = useRef(
    debounce(async (term: string) => {
      if (!term.trim()) {
        setResults([]);
        setDropdownOpen(false);
        return;
      }

      setLoading(true);
      try {
        const data = await fetchFromProxy(
          `/search/multi?query=${encodeURIComponent(term)}`
        );
        setResults(data?.results?.slice(0, 10) || []);
        setDropdownOpen(true);
      } catch (err) {
        console.error("❌ TMDB Search Failed", err);
      } finally {
        setLoading(false);
      }
    }, 400)
  ).current;

  useEffect(() => {
    debouncedSearch(query);
  }, [query]);

  // 🔹 Close on outside click or ESC
  useEffect(() => {
    const clickOutside = (e: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setQuery("");
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", clickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", clickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const handleSelect = useCallback(
    async (item: TMDBResult) => {
      const full = await fetchDetails(item.id, item.media_type);
      if (!full) return;

      if (item.media_type === "person" && onSelectPerson) {
        onSelectPerson(full);
      } else {
        onSelectMovie(full);
      }

      setQuery("");
      setResults([]);
      setDropdownOpen(false);
    },
    [onSelectMovie, onSelectPerson]
  );

  return (
    <div className="w-full flex flex-col items-center">
      {/* Search Input */}
      <motion.form
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
        onSubmit={(e) => e.preventDefault()}
        className="w-full flex items-center gap-2 rounded-xl shadow-md border px-4 py-2"
        style={{
          backgroundColor: "hsl(var(--background))",
          borderColor: "hsl(var(--foreground))",
        }}
      >
        <motion.input
          ref={inputRef}
          type="text"
          name="search"
          placeholder="Search movies, shows, people..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          whileFocus={{ scale: 1.02 }}
          className="flex-1 bg-transparent outline-none text-base md:text-lg placeholder:text-gray-500"
          style={{ color: "hsl(var(--foreground))" }}
        />
        <motion.button
          type="submit"
          whileTap={{ scale: 0.97 }}
          whileHover={{ scale: 1.12 }}
          className="h-10 w-10 flex items-center justify-center rounded-full"
          style={{ color: "hsl(var(--foreground))" }}
        >
          <motion.span animate={iconControls}>
            <Search className="h-5 w-5" />
          </motion.span>
        </motion.button>
      </motion.form>

      {/* Dropdown Results */}
      {dropdownOpen && (
        <div
          ref={resultsRef}
          className="w-full mt-4 rounded-lg shadow-lg overflow-hidden bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"
        >
          {loading && <div className="p-6 text-sm text-center">Loading...</div>}
          {!loading && results.length === 0 && query.trim() && (
            <div className="p-3 text-sm text-center">No results found.</div>
          )}
          {results.map((item) => {
            const image =
              item.media_type === "person"
                ? item.profile_path
                : item.poster_path;
            const name = item.title || item.name || "Unknown";
            return (
              <div
                key={`${item.media_type}-${item.id}`}
                className="flex items-center gap-3 px-4 py-2 hover:bg-[hsl(var(--foreground))]/10 cursor-pointer"
                onClick={() => handleSelect(item)}
              >
                <img
                  src={
                    image
                      ? `https://image.tmdb.org/t/p/w92${image}`
                      : "/fallback.jpg"
                  }
                  alt={name}
                  loading="lazy"
                  className={`w-10 h-14 object-cover rounded-md ${
                    image ? "" : "opacity-70 blur-sm"
                  }`}
                />
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{name}</span>
                  <span className="text-xs text-zinc-400 uppercase">
                    {item.media_type}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

export default SearchBar;

// TMDB result type
type TMDBResult = {
  id: number;
  title?: string;
  name?: string;
  media_type: "movie" | "tv" | "person";
  poster_path?: string;
  profile_path?: string;
};
