import { TMDB_IMAGE } from "@/lib/tmdb";

interface KnownForItem {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string;
  release_date?: string;
  media_type?: string;
}

export default function CastSlider({ items }: { items: KnownForItem[] }) {
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
              className="w-28 flex-shrink-0 text-center space-y-1"
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
