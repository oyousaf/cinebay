import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type MediaType = "movie" | "tv" | "person";

/**
 * Cache resolved embeds per session + localStorage
 */
const embedCache = new Map<string, string>();

/**
 * ✅ Current VidSrc embed domains (official rotation)
 */
const PROVIDERS = [
  "vidsrc-embed.ru",
  "vidsrc-embed.su",
  "vidsrcme.su",
  "vsrc.su",
];

/**
 * Heuristic markers that indicate failure / placeholder pages
 */
const INVALID_MARKERS = [
  "not found",
  "video not found",
  "file not found",
  "404",
  "removed",
  "unavailable",
  "no stream",
];

export function useVideoEmbed(id?: number, type?: MediaType): string | null {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);

  // Prevent repeated toasts for the same title
  const hasErroredRef = useRef(false);

  useEffect(() => {
    if (!id || !type || type === "person") {
      setEmbedUrl(null);
      return;
    }

    const cacheKey = `${type}:${id}`;

    /* ---------- Cache lookup ---------- */
    const cached =
      embedCache.get(cacheKey) ?? localStorage.getItem(`embed:${cacheKey}`);

    if (cached) {
      embedCache.set(cacheKey, cached);
      setEmbedUrl(cached);
      return;
    }

    /* ---------- Hidden probe iframe ---------- */
    let iframe: HTMLIFrameElement | null = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);

    let index = 0;
    let resolved = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (iframe?.parentNode) iframe.parentNode.removeChild(iframe);
      iframe = null;
    };

    const tryNext = () => {
      if (!iframe || index >= PROVIDERS.length) {
        cleanup();

        if (!hasErroredRef.current) {
          hasErroredRef.current = true;
          toast.error("No streaming source available for this title.");
        }

        return;
      }

      const provider = PROVIDERS[index];
      const url = `https://${provider}/embed/${type}/${id}`;

      console.log(
        `[useVideoEmbed] trying ${index + 1}/${PROVIDERS.length}:`,
        provider
      );

      iframe.src = url;

      timeoutId = setTimeout(() => {
        index++;
        tryNext();
      }, 3000);
    };

    iframe.onload = () => {
      if (!iframe || resolved) return;

      try {
        const text =
          iframe.contentDocument?.body?.innerText?.toLowerCase() ?? "";

        const invalid = INVALID_MARKERS.some((m) => text.includes(m));

        if (invalid) {
          console.warn("[useVideoEmbed] rejected:", PROVIDERS[index]);
          index++;
          tryNext();
          return;
        }

        // ✅ Valid embed
        resolved = true;
        embedCache.set(cacheKey, iframe.src);
        localStorage.setItem(`embed:${cacheKey}`, iframe.src);
        setEmbedUrl(iframe.src);
        cleanup();
      } catch {
        resolved = true;
        embedCache.set(cacheKey, iframe.src);
        localStorage.setItem(`embed:${cacheKey}`, iframe.src);
        setEmbedUrl(iframe.src);
        cleanup();
      }
    };

    iframe.onerror = () => {
      console.warn("[useVideoEmbed] iframe error:", PROVIDERS[index]);
      index++;
      tryNext();
    };

    tryNext();

    return cleanup;
  }, [id, type]);

  return embedUrl;
}
