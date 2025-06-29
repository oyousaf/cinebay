import { TMDB_IMAGE, fetchDetails } from "@/lib/tmdb";
import type { KnownForItem, Movie } from "@/types/movie";

export default function CastSlider({
  items,
  onSelect,
}: {
  items: KnownForItem[];
  onSelect?: (item: Movie) => void;
}) {
  const handleSelect = async (item: KnownForItem) => {
    if (!onSelect || !item.media_type) return;
    const validType = item.media_type === "movie" || item.media_type === "tv";
    if (!validType) return;

    const full = await fetchDetails(item.id, item.media_type);
    if (full?.media_type) onSelect(full);
  };

  return (
    <div className="pt-2">
      <h3 className="text-sm font-semibold text-zinc-300 mb-2">Known For</h3>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {items.map((item) => {
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
              onClick={() => handleSelect(item)}
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
