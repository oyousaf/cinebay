"use client";

import { useEffect, useState } from "react";

export function useRailData<T>(
  fetcher: () => Promise<T[]>,
  filter?: (item: T) => boolean,
) {
  const [data, setData] = useState<T[] | null>(null);

  useEffect(() => {
    let alive = true;

    fetcher()
      .then((res) => {
        if (!alive || !Array.isArray(res)) return;

        const next = filter ? res.filter(filter) : res;
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
