import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { toast } from "sonner";
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
    setWatchlist((prev) => {
      if (prev.some((m) => m.id === movie.id)) return prev;

      toast.success(
        <span>
          Added <strong>{movie.title || movie.name}</strong> to Watchlist
        </span>
      );
      return [movie, ...prev];
    });
  }, []);

  const removeFromWatchlist = useCallback((id: number) => {
    setWatchlist((prev) => {
      const movie = prev.find((m) => m.id === id);
      const updated = prev.filter((m) => m.id !== id);

      if (movie) {
        toast.error(
          <div className="flex items-center justify-between gap-4 w-full">
            <span>
              Removed <strong>{movie.title || movie.name}</strong> from
              Watchlist
            </span>
            <button
              onClick={() => {
                setWatchlist([movie, ...updated]);
                toast.success(
                  <span>
                    Restored <strong>{movie.title || movie.name}</strong>
                  </span>
                );
              }}
              className="text-yellow-400 hover:underline whitespace-nowrap"
            >
              Undo
            </button>
          </div>,
          { duration: 6000 }
        );
      }

      return updated;
    });
  }, []);

  const toggleWatchlist = useCallback((movie: Movie) => {
    setWatchlist((prev) => {
      if (prev.some((m) => m.id === movie.id)) {
        // Remove
        const updated = prev.filter((m) => m.id !== movie.id);
        toast.error(
          <div className="flex items-center justify-between gap-4 w-full">
            <span>
              Removed <strong>{movie.title || movie.name}</strong> from
              Watchlist
            </span>
            <button
              onClick={() => {
                setWatchlist([movie, ...updated]);
                toast.success(
                  <span>
                    Restored <strong>{movie.title || movie.name}</strong>
                  </span>
                );
              }}
              className="text-yellow-400 hover:underline whitespace-nowrap"
            >
              Undo
            </button>
          </div>,
          { duration: 6000 }
        );
        return updated;
      } else {
        // Add
        toast.success(
          <span>
            Added <strong>{movie.title || movie.name}</strong> to Watchlist
          </span>
        );
        return [movie, ...prev];
      }
    });
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
