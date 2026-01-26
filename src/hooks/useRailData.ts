"use client";

import { useEffect, useRef, useState } from "react";

/* -------------------------------------------------
   HELPERS
-------------------------------------------------- */
function dedupeById<T extends { id?: number | string }>(items: T[]): T[] {
  const seen = new Set<number | string>();
  const out: T[] = [];

  for (const item of items) {
    if (!item || item.id == null) continue;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }

  return out;
}

/* -------------------------------------------------
   HOOK
-------------------------------------------------- */
export function useRailData<T extends { id?: number | string }>(
  fetcher: () => Promise<T[]>,
  filter?: (item: T) => boolean,
  deps: unknown[] = [],
) {
  const [data, setData] = useState<T[] | null>(null);

  const fetcherRef = useRef(fetcher);
  const filterRef = useRef(filter);

  // Always keep latest references without re-triggering fetch.
  fetcherRef.current = fetcher;
  filterRef.current = filter;

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await fetcherRef.current();
        if (!alive) return;

        if (!Array.isArray(res)) {
          setData([]);
          return;
        }

        let next = res;

        const f = filterRef.current;
        if (f) next = next.filter(f);

        next = dedupeById(next);

        setData(next);
      } catch (err) {
        console.error("Rail fetch failed:", err);
        if (alive) setData([]);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return data;
}
