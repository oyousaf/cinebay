import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  buildEmbedUrl,
  buildEmbedCacheKey,
  EMBED_PROVIDERS,
  type PlaybackIntent,
} from "@/lib/embed/buildEmbedUrl";

import { useContinueWatching } from "@/lib/continueWatching";

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
  const hasErroredRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { setTVProgress } = useContinueWatching();

  useEffect(() => {
    if (!intent) {
      setEmbedUrl(null);
      return;
    }

    const cacheKey = buildEmbedCacheKey(intent);
    const cached = memoryCache.get(cacheKey) ?? localStorage.getItem(cacheKey);

    if (cached) {
      memoryCache.set(cacheKey, cached);
      setEmbedUrl(cached);
      return;
    }

    let iframe: HTMLIFrameElement | null = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);

    let index = 0;
    let resolved = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      iframe?.remove();
      iframe = null;
    };

    const armResumeTimer = () => {
      if (intent.mediaType !== "tv") return;

      resumeTimerRef.current = setTimeout(() => {
        setTVProgress(
          intent.tmdbId,
          intent.season ?? 1,
          intent.episode ?? 1,
          RESUME_DELAY_MS / 1000,
        );
      }, RESUME_DELAY_MS);
    };

    const tryNext = () => {
      if (!iframe || index >= EMBED_PROVIDERS.length) {
        cleanup();
        if (!hasErroredRef.current) {
          hasErroredRef.current = true;
          toast.error("No streaming source available.");
        }
        return;
      }

      const provider = EMBED_PROVIDERS[index];
      iframe.src = buildEmbedUrl(provider, intent);

      timeoutId = setTimeout(() => {
        index++;
        tryNext();
      }, 3000);
    };

    iframe.onload = () => {
      if (!iframe || resolved) return;

      if (EMBED_PROVIDERS[index].name === "vidlink") {
        resolved = true;
        memoryCache.set(cacheKey, iframe.src);
        localStorage.setItem(cacheKey, iframe.src);
        setEmbedUrl(iframe.src);
        armResumeTimer();
        cleanup();
        return;
      }

      try {
        const text =
          iframe.contentDocument?.body?.innerText?.toLowerCase() ?? "";

        const invalid = INVALID_MARKERS.some((m) => text.includes(m));
        if (invalid) {
          index++;
          tryNext();
          return;
        }

        resolved = true;
        memoryCache.set(cacheKey, iframe.src);
        localStorage.setItem(cacheKey, iframe.src);
        setEmbedUrl(iframe.src);
        armResumeTimer();
        cleanup();
      } catch {
        resolved = true;
        memoryCache.set(cacheKey, iframe.src);
        localStorage.setItem(cacheKey, iframe.src);
        setEmbedUrl(iframe.src);
        armResumeTimer();
        cleanup();
      }
    };

    iframe.onerror = () => {
      index++;
      tryNext();
    };

    tryNext();
    return cleanup;
  }, [intent, setTVProgress]);

  return embedUrl;
}
