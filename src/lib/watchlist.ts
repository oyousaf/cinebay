import type { Movie } from "@/types/movie";

const STORAGE_KEY = "cinebay-watchlist";

export function getWatchlist(): Movie[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function saveToWatchlist(movie: Movie) {
  const list = getWatchlist();
  const exists = list.find((m) => m.id === movie.id);
  if (!exists) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...list, movie]));
  }
}

export function removeFromWatchlist(id: number) {
  const list = getWatchlist();
  const updated = list.filter((m) => m.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function isInWatchlist(id: number): boolean {
  return getWatchlist().some((m) => m.id === id);
}
