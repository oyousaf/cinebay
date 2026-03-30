"use client";

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

interface WatchlistContextType {
  watchlist: Movie[];
  addToWatchlist: (movie: Movie) => void;
  removeFromWatchlist: (id: number) => void;
  toggleWatchlist: (movie: Movie) => void;
  isInWatchlist: (id: number) => boolean;
}

const STORAGE_KEY = "watchlist";

const WatchlistContext = createContext<WatchlistContextType | null>(null);

/* ---------- Storage helpers ---------- */

function readStorage(): Movie[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStorage(list: Movie[]) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [watchlist, setWatchlist] = useState<Movie[]>([]);

  /* ---------- Hydrate from localStorage ---------- */

  useEffect(() => {
    setWatchlist(readStorage());
  }, []);

  /* ---------- Sync to localStorage ---------- */

  useEffect(() => {
    writeStorage(watchlist);
  }, [watchlist]);

  /* ---------- Cross-tab sync ---------- */

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      setWatchlist(readStorage());
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /* ---------- Toast helpers ---------- */

  const notifyAdd = (movie: Movie) => {
    toast.success(
      <span>
        Added <strong>{movie.title || movie.name}</strong> to Watchlist
      </span>,
    );
  };

  const notifyRestore = (movie: Movie) => {
    toast.success(
      <span>
        Restored <strong>{movie.title || movie.name}</strong>
      </span>,
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
      { duration: 6000 },
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

  const removeFromWatchlist = useCallback((id: number) => {
    setWatchlist((prev) => {
      const movie = prev.find((m) => m.id === id);
      if (!movie) return prev;

      notifyRemove(movie, () => {
        setWatchlist((restorePrev) => {
          if (restorePrev.some((m) => m.id === movie.id)) return restorePrev;
          return [movie, ...restorePrev];
        });
        notifyRestore(movie);
      });

      return prev.filter((m) => m.id !== id);
    });
  }, []);

  const toggleWatchlist = useCallback((movie: Movie) => {
    setWatchlist((prev) => {
      const exists = prev.some((m) => m.id === movie.id);

      if (exists) {
        notifyRemove(movie, () => {
          setWatchlist((restorePrev) => {
            if (restorePrev.some((m) => m.id === movie.id)) return restorePrev;
            return [movie, ...restorePrev];
          });
          notifyRestore(movie);
        });

        return prev.filter((m) => m.id !== movie.id);
      }

      notifyAdd(movie);
      return [movie, ...prev];
    });
  }, []);

  const isInWatchlist = useCallback(
    (id: number) => watchlist.some((m) => m.id === id),
    [watchlist],
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
