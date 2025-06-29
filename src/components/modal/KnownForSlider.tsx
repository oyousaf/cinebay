import { TMDB_IMAGE } from "@/lib/tmdb";
import type { KnownForItem, Movie } from "@/types/movie";

export default function KnownForSlider({
  items,
  onSelect,
}: {
  items: KnownForItem[];
  onSelect?: (item: Movie) => void;
}) {
  if (!items?.length) return null;

  const sorted = [...items].sort(
    (a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0)
  );

  return (
    <div
      className="overflow-x-auto scrollbar-hide -mx-1 px-1"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <div className="flex gap-3 pb-2">
        {sorted.map((item) => {
          const title = item.title || item.name || "Untitled";
          const poster = item.poster_path
            ? `${TMDB_IMAGE}${item.poster_path}`
            : "/fallback.jpg";
          const year = item.release_date
            ? new Date(item.release_date).getFullYear()
            : "";

          return (
            <div
              key={item.id}
              onClick={() => {
                if (item.id && item.media_type && onSelect) {
                  onSelect({
                    id: item.id,
                    title,
                    media_type: item.media_type,
                    poster_path: item.poster_path || "",
                    backdrop_path: "",
                    profile_path: "",
                    overview: "",
                    release_date: item.release_date || "",
                    vote_average: 0,
                    genres: [],
                    runtime: null,
                    original_language: "",
                    isNew: false,
                    recommendations: [],
                  });
                }
              }}
              className="w-28 flex-shrink-0 text-center space-y-1 cursor-pointer"
            >
              <img
                src={poster}
                alt={title}
                className="w-28 h-40 object-cover rounded-lg shadow"
                loading="lazy"
              />
              <div className="text-xs text-zinc-300 font-medium truncate">
                {title}
              </div>
              <div className="text-xs text-zinc-500">{year}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
