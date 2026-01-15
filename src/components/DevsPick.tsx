"use client";

import { useEffect, useState } from "react";
import ContentRail from "@/components/ContentRail";
import { fetchDevsPick } from "@/lib/tmdb";
import type { Movie } from "@/types/movie";

interface DevsPickProps {
  onSelect: (movie: Movie) => void;
  onWatch: (url: string) => void;
}

export default function DevsPick({ onSelect, onWatch }: DevsPickProps) {
  const [items, setItems] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const data = await fetchDevsPick();
        if (!alive || !Array.isArray(data)) return;

        setItems(
          data.filter(
            (m) => m?.id && (m.title || m.name) && m.media_type !== "person"
          )
        );
      } catch (err) {
        console.error("Dev’s Pick fetch failed", err);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <ContentRail
      title="Dev’s Pick"
      items={items}
      onSelect={onSelect}
      onWatch={onWatch}
    />
  );
}
