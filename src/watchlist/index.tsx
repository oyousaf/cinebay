import { useEffect, useState } from "react";
import { getWatchlist, removeFromWatchlist } from "@/lib/watchlist";
import type { Movie } from "@/types/movie";
import Modal from "@/components/Modal";
import Navbar from "@/components/Navbar";

export default function Watchlist() {
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  useEffect(() => {
    setWatchlist(getWatchlist());
  }, []);

  const handleRemove = (id: number) => {
    removeFromWatchlist(id);
    setWatchlist((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="pt-[176px] px-4 max-w-6xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold mb-6">Your Watchlist</h1>
        {watchlist.length === 0 ? (
          <p className="text-zinc-400">You haven’t saved anything yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {watchlist.map((movie) => (
              <div
                key={movie.id}
                className="relative group cursor-pointer"
                onClick={() => setSelectedMovie(movie)}
              >
                <img
                  src={
                    movie.poster_path
                      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                      : "/fallback.jpg"
                  }
                  alt={movie.title}
                  className="rounded-lg shadow-lg w-full object-cover"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(movie.id);
                  }}
                  className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded hover:bg-red-500"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedMovie && (
        <Modal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />
      )}
    </div>
  );
}
