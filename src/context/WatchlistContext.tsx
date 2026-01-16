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

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("watchlist", JSON.stringify(watchlist));
    }
  }, [watchlist]);

  /* ---------- Toast helpers ---------- */

  const notifyAdd = (movie: Movie) => {
    toast.success(
      <span>
        Added <strong>{movie.title || movie.name}</strong> to Watchlist
      </span>
    );
  };

  const notifyRestore = (movie: Movie) => {
    toast.success(
      <span>
        Restored <strong>{movie.title || movie.name}</strong>
      </span>
    );
  };

  const notifyRemove = (movie: Movie, restore: () => void) => {
    const id = toast.error(
      <div className="flex items-center justify-between gap-4 w-full">
        <span>
          Removed <strong>{movie.title || movie.name}</strong> from Watchlist
        </span>
        <button
          onClick={() => {
            toast.dismiss(id);
            restore();
          }}
          className="text-yellow-400 hover:underline whitespace-nowrap"
        >
          Undo
        </button>
      </div>,
      { duration: 6000 }
    );
  };

  /* ---------- Actions ---------- */

  const addToWatchlist = useCallback((movie: Movie) => {
    setWatchlist((prev) => {
      if (prev.some((m) => m.id === movie.id)) return prev;
      return [movie, ...prev];
    });

    notifyAdd(movie);
  }, []);

  const removeFromWatchlist = useCallback(
    (id: number) => {
      const movie = watchlist.find((m) => m.id === id);
      if (!movie) return;

      setWatchlist((prev) => prev.filter((m) => m.id !== id));

      notifyRemove(movie, () => {
        setWatchlist((prev) => [movie, ...prev]);
        notifyRestore(movie);
      });
    },
    [watchlist]
  );

  const toggleWatchlist = useCallback(
    (movie: Movie) => {
      const exists = watchlist.some((m) => m.id === movie.id);

      if (exists) {
        setWatchlist((prev) => prev.filter((m) => m.id !== movie.id));

        notifyRemove(movie, () => {
          setWatchlist((prev) => [movie, ...prev]);
          notifyRestore(movie);
        });
      } else {
        setWatchlist((prev) => [movie, ...prev]);
        notifyAdd(movie);
      }
    },
    [watchlist]
  );

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
