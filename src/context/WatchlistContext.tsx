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

  // Sync with localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("watchlist", JSON.stringify(watchlist));
    }
  }, [watchlist]);

  /** 🔔 Toast helpers */
  const notifyAdd = (movie: Movie) =>
    toast.success(
      <span>
        Added <strong>{movie.title || movie.name}</strong> to Watchlist
      </span>
    );

  const notifyRemove = (movie: Movie, restore: () => void) =>
    toast.error(
      <div className="flex items-center justify-between gap-4 w-full">
        <span>
          Removed <strong>{movie.title || movie.name}</strong> from Watchlist
        </span>
        <button
          onClick={restore}
          className="text-yellow-400 hover:underline whitespace-nowrap"
        >
          Undo
        </button>
      </div>,
      { duration: 6000 }
    );

  const notifyRestore = (movie: Movie) =>
    toast.success(
      <span>
        Restored <strong>{movie.title || movie.name}</strong>
      </span>
    );

  /** 📌 Add */
  const addToWatchlist = useCallback((movie: Movie) => {
    setWatchlist((prev) => {
      if (prev.some((m) => m.id === movie.id)) return prev;
      notifyAdd(movie);
      return [movie, ...prev];
    });
  }, []);

  /** 📌 Remove */
  const removeFromWatchlist = useCallback((id: number) => {
    setWatchlist((prev) => {
      const movie = prev.find((m) => m.id === id);
      if (!movie) return prev;

      const updated = prev.filter((m) => m.id !== id);

      notifyRemove(movie, () => {
        setWatchlist([movie, ...updated]);
        notifyRestore(movie);
      });

      return updated;
    });
  }, []);

  /** 📌 Toggle */
  const toggleWatchlist = useCallback((movie: Movie) => {
    setWatchlist((prev) => {
      if (prev.some((m) => m.id === movie.id)) {
        // remove
        const updated = prev.filter((m) => m.id !== movie.id);

        notifyRemove(movie, () => {
          setWatchlist([movie, ...updated]);
          notifyRestore(movie);
        });

        return updated;
      } else {
        // add
        notifyAdd(movie);
        return [movie, ...prev];
      }
    });
  }, []);

  /** 📌 Check */
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
