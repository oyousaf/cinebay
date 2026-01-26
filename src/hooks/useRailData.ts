"use client";

import { useEffect, useState } from "react";

/* -------------------------------------------------
   HELPERS
-------------------------------------------------- */
function dedupeById<T extends { id?: number | string }>(items: T[]): T[] {
  const seen = new Set<string | number>();
  return items.filter((item) => {
    if (item?.id == null) return false;
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

/* -------------------------------------------------
   HOOK
-------------------------------------------------- */
export function useRailData<T extends { id?: number | string }>(
  fetcher: () => Promise<T[]>,
  filter?: (item: T) => boolean,
) {
  const [data, setData] = useState<T[] | null>(null);

  useEffect(() => {
    let alive = true;

    fetcher()
      .then((res) => {
        if (!alive) return;
        if (!Array.isArray(res)) {
          setData([]);
          return;
        }

        let next = res;

        if (filter) {
          next = next.filter(filter);
        }

        next = dedupeById(next);

        setData(next);
      })
      .catch((err) => {
        console.error("Rail fetch failed:", err);
        if (alive) setData([]);
      });

    return () => {
      alive = false;
    };
  }, [fetcher, filter]);

  return data;
}
