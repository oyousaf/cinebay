import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import type { Movie } from "@/types/movie";
import { getWatchlist } from "@/lib/watchlist";

interface WatchlistContextType {
  watchlist: Movie[];
  addToWatchlist: (movie: Movie) => void;
  removeFromWatchlist: (id: number) => void;
  toggleWatchlist: (movie: Movie) => void;
  isInWatchlist: (id: number) => boolean;
}

const WatchlistContext = createContext<WatchlistContextType | null>(null);

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [watchlist, setWatchlist] = useState<Movie[]>(() =>
    typeof window !== "undefined" ? getWatchlist() : []
  );

  // Keep localStorage in sync
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("watchlist", JSON.stringify(watchlist));
    }
  }, [watchlist]);

  const addToWatchlist = useCallback((movie: Movie) => {
    setWatchlist((prev) =>
      prev.some((m) => m.id === movie.id) ? prev : [movie, ...prev]
    );
  }, []);

  const removeFromWatchlist = useCallback((id: number) => {
    setWatchlist((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const toggleWatchlist = useCallback((movie: Movie) => {
    setWatchlist((prev) =>
      prev.some((m) => m.id === movie.id)
        ? prev.filter((m) => m.id !== movie.id)
        : [movie, ...prev]
    );
  }, []);

  const isInWatchlist = useCallback(
    (id: number) => watchlist.some((m) => m.id === id),
    [watchlist]
  );

  return (
    <WatchlistContext.Provider
      value={{
        watchlist,
        addToWatchlist,
        removeFromWatchlist,
        toggleWatchlist,
        isInWatchlist,
      }}
    >
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const context = useContext(WatchlistContext);
  if (!context) {
    throw new Error("useWatchlist must be used inside WatchlistProvider");
  }
  return context;
}
