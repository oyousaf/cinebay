import { useState, useEffect, useRef } from "react";
import { motion, useAnimation } from "framer-motion";
import { Search } from "lucide-react";
import debounce from "lodash.debounce";

type TMDBResult = {
  id: number;
  title?: string;
  name?: string;
  media_type: "movie" | "tv" | "person";
  poster_path?: string;
  profile_path?: string; // used for person
};

export default function SearchBar({
  onSearch,
}: {
  onSearch: (q: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TMDBResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const iconControls = useAnimation();
  const barControls = useAnimation();
  const lastScroll = useRef(0);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Scroll hide
  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;
      if (current > lastScroll.current && current > 80) {
        barControls.start({ y: -80, opacity: 0 });
      } else {
        barControls.start({ y: 0, opacity: 1 });
      }
      lastScroll.current = current;
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [barControls]);

  // Debounced search
  const debouncedSearch = useRef(
    debounce(async (searchTerm: string) => {
      if (!searchTerm) {
        setResults([]);
        setDropdownOpen(false);
        return;
      }

      setLoading(true);
      setError(false);
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(
            searchTerm
          )}&api_key=${import.meta.env.VITE_TMDB_KEY}&language=en-GB`
        );
        const data = await res.json();
        setResults(data.results?.slice(0, 10) || []);
        setDropdownOpen(true);
      } catch {
        setError(true);
        setDropdownOpen(true);
      } finally {
        setLoading(false);
      }
    }, 400)
  ).current;

  useEffect(() => {
    debouncedSearch(query);
  }, [query]);

  // Escape and click-outside handling
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
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
        setResults([]);
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  return (
    <motion.div
      animate={barControls}
      initial={{ y: 0, opacity: 1 }}
      className="fixed top-[88px] left-0 w-full z-40 flex flex-col items-center px-4 sm:px-6 py-4"
    >
      <motion.form
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
        onSubmit={(e) => {
          e.preventDefault();
          onSearch(query.trim());
          setDropdownOpen(false);
        }}
        autoComplete="off"
        className="w-full max-w-md flex items-center gap-2 rounded-xl shadow-md border"
        style={{
          backgroundColor: "hsl(var(--background))",
          borderColor: "hsl(var(--foreground))",
          padding: "0.5rem 1rem",
        }}
      >
        <motion.input
          type="text"
          placeholder="Search movies, shows, people..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          whileFocus={{ scale: 1.02 }}
          className="flex-1 text-base md:text-lg bg-transparent outline-none placeholder:text-gray-500"
          style={{ color: "hsl(var(--foreground))" }}
        />
        <motion.button
          type="submit"
          whileTap={{ scale: 0.97 }}
          whileHover={{ scale: 1.12 }}
          className="h-10 w-10 flex items-center justify-center rounded-full transition-colors"
          style={{
            color: "hsl(var(--foreground))",
            backgroundColor: "transparent",
            border: "none",
          }}
          onHoverStart={() =>
            iconControls.start({
              rotate: [0, 16, -16, 0],
              transition: { duration: 0.5, ease: "easeInOut" },
            })
          }
          onHoverEnd={() =>
            iconControls.start({
              rotate: 0,
              transition: { duration: 0.3, ease: "easeOut" },
            })
          }
          aria-label="Search"
        >
          <motion.span animate={iconControls}>
            <Search className="h-5 w-5" />
          </motion.span>
        </motion.button>
      </motion.form>

      {/* Suggestions Dropdown */}
      {dropdownOpen && (
        <div
          ref={resultsRef}
          className="w-full max-w-md mt-2 rounded-lg shadow-lg overflow-hidden bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"
        >
          {loading && <div className="p-3 text-sm text-center">Loading...</div>}
          {error && (
            <div className="p-3 text-sm text-red-500 text-center">
              Error fetching results.
            </div>
          )}
          {!loading && results.length === 0 && query.trim() && (
            <div className="p-3 text-sm text-center">No results found.</div>
          )}
          {results.map((item) => {
            const imagePath =
              item.media_type === "person"
                ? item.profile_path
                : item.poster_path;

            return (
              <div
                key={`${item.media_type}-${item.id}`}
                className="flex items-center gap-3 px-4 py-2 hover:bg-[hsl(var(--foreground))]/10 cursor-pointer"
                onClick={() => {
                  onSearch(item.title || item.name || "");
                  setQuery("");
                  setResults([]);
                  setDropdownOpen(false);
                }}
              >
                <img
                  src={
                    imagePath
                      ? `https://image.tmdb.org/t/p/w92${imagePath}`
                      : "/fallback.jpg"
                  }
                  alt={item.title || item.name}
                  className={`w-10 h-14 object-cover rounded-md ${
                    imagePath ? "" : "opacity-70 blur-sm"
                  }`}
                />

                <div className="flex flex-col">
                  <span className="font-medium text-sm">
                    {item.title || item.name}
                  </span>
                  <span className="text-xs text-zinc-400 capitalize">
                    {item.media_type}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
