"use client";

import { useEffect, useState } from "react";
import ContentRail from "@/components/ContentRail";
import { fetchDevsPick } from "@/lib/tmdb";
import type { Movie } from "@/types/movie";

interface DevsPickProps {
  onSelect: (movie: Movie) => void;
}

export default function DevsPick({ onSelect }: DevsPickProps) {
  const [items, setItems] = useState<Movie[]>([]);

  useEffect(() => {
    let alive = true;

    fetchDevsPick()
      .then((data) => {
        if (!alive || !Array.isArray(data)) return;

        setItems(
          data.filter(
            (m) => m?.id && (m.title || m.name) && m.media_type !== "person",
          ),
        );
      })
      .catch((err) => {
        console.error("Dev’s Pick fetch failed", err);
      });

    return () => {
      alive = false;
    };
  }, []);

  return <ContentRail title="Dev’s Pick" items={items} onSelect={onSelect} />;
}
