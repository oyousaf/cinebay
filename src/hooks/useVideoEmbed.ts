import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  buildEmbedUrl,
  buildEmbedCacheKey,
  EMBED_PROVIDERS,
  type PlaybackIntent,
} from "@/lib/embed/buildEmbedUrl";

const INVALID_MARKERS = [
  "not found",
  "video not found",
  "file not found",
  "404",
  "removed",
  "unavailable",
  "no stream",
];

const memoryCache = new Map<string, string>();

export function useVideoEmbed(intent?: PlaybackIntent): string | null {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);

  const hasErroredRef = useRef(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const timeoutRef = useRef<number | null>(null);

  /* ---------- CLEANUP ---------- */
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      iframeRef.current?.remove();
      iframeRef.current = null;
    };
  }, []);

  /* ---------- EMBED RESOLUTION ---------- */
  useEffect(() => {
    if (!intent) {
      setEmbedUrl(null);
      return;
    }

    hasErroredRef.current = false;

    const cacheKey = buildEmbedCacheKey(intent);
    const cached = memoryCache.get(cacheKey) ?? localStorage.getItem(cacheKey);

    if (cached) {
      memoryCache.set(cacheKey, cached);
      setEmbedUrl(cached);
      return;
    }

    let index = 0;
    let resolved = false;

    const cleanup = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      iframeRef.current?.remove();
      iframeRef.current = null;
    };

    const resolve = (src: string) => {
      if (resolved) return;
      resolved = true;

      memoryCache.set(cacheKey, src);
      localStorage.setItem(cacheKey, src);
      setEmbedUrl(src);
      cleanup();
    };

    const tryNext = () => {
      if (index >= EMBED_PROVIDERS.length) {
        cleanup();
        if (!hasErroredRef.current) {
          hasErroredRef.current = true;
          toast.error("No streaming source available.");
        }
        return;
      }

      const provider = EMBED_PROVIDERS[index];
      const src = buildEmbedUrl(provider, intent);

      if (provider.name === "vidlink") {
        resolve(src);
        return;
      }

      /* ---------- Fallback providers probing ---------- */

      if (!iframeRef.current) {
        iframeRef.current = document.createElement("iframe");
        iframeRef.current.style.display = "none";
        document.body.appendChild(iframeRef.current);

        iframeRef.current.onload = () => {
          if (!iframeRef.current || resolved) return;

          try {
            const text =
              iframeRef.current.contentDocument?.body?.innerText?.toLowerCase() ??
              "";

            if (INVALID_MARKERS.some((m) => text.includes(m))) {
              index++;
              tryNext();
              return;
            }

            resolve(iframeRef.current.src);
          } catch {
            // cross-origin → assume valid
            resolve(iframeRef.current.src);
          }
        };

        iframeRef.current.onerror = () => {
          index++;
          tryNext();
        };
      }

      iframeRef.current.src = src;

      timeoutRef.current = window.setTimeout(() => {
        index++;
        tryNext();
      }, 2500);
    };

    tryNext();

    return cleanup;
  }, [intent]);

  return embedUrl;
}
