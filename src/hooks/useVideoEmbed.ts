import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  buildEmbedUrl,
  buildEmbedCacheKey,
  EMBED_PROVIDERS,
  type PlaybackIntent,
} from "@/lib/embed/buildEmbedUrl";

import { setTVProgress } from "@/lib/continueWatching";

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
const RESUME_DELAY_MS = 30_000;

export function useVideoEmbed(intent?: PlaybackIntent): string | null {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);

  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumeArmedRef = useRef(false);
  const hasErroredRef = useRef(false);

  useEffect(() => {
    if (!intent) {
      setEmbedUrl(null);
      return;
    }

    hasErroredRef.current = false;
    resumeArmedRef.current = false;

    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }

    const armResume = () => {
      if (intent.mediaType !== "tv") return;
      if (resumeArmedRef.current) return;

      resumeArmedRef.current = true;

      resumeTimerRef.current = setTimeout(() => {
        setTVProgress(
          intent.tmdbId,
          intent.season ?? 1,
          intent.episode ?? 1,
          RESUME_DELAY_MS / 1000,
        );
      }, RESUME_DELAY_MS);
    };

    const cacheKey = buildEmbedCacheKey(intent);
    const cached = memoryCache.get(cacheKey) ?? localStorage.getItem(cacheKey);

    if (cached) {
      memoryCache.set(cacheKey, cached);
      setEmbedUrl(cached);
      armResume();
      return () => {
        if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      };
    }

    let iframe: HTMLIFrameElement | null = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);

    let index = 0;
    let resolved = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const cleanupProbe = () => {
      if (timeoutId) clearTimeout(timeoutId);
      iframe?.remove();
      iframe = null;
    };

    const resolve = (src: string) => {
      if (resolved) return;
      resolved = true;

      memoryCache.set(cacheKey, src);
      localStorage.setItem(cacheKey, src);
      setEmbedUrl(src);
      armResume();
      cleanupProbe();
    };

    const tryNext = () => {
      if (!iframe || index >= EMBED_PROVIDERS.length) {
        cleanupProbe();
        if (!hasErroredRef.current) {
          hasErroredRef.current = true;
          toast.error("No streaming source available.");
        }
        return;
      }

      iframe.src = buildEmbedUrl(EMBED_PROVIDERS[index], intent);
      timeoutId = setTimeout(() => {
        index++;
        tryNext();
      }, 3000);
    };

    iframe.onload = () => {
      if (!iframe || resolved) return;

      if (EMBED_PROVIDERS[index].name === "vidlink") {
        resolve(iframe.src);
        return;
      }

      try {
        const text =
          iframe.contentDocument?.body?.innerText?.toLowerCase() ?? "";

        if (INVALID_MARKERS.some((m) => text.includes(m))) {
          index++;
          tryNext();
          return;
        }

        resolve(iframe.src);
      } catch {
        resolve(iframe.src);
      }
    };

    iframe.onerror = () => {
      index++;
      tryNext();
    };

    tryNext();

    return () => {
      cleanupProbe();
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, [intent]);

  return embedUrl;
}
