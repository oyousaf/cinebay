import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type MediaType = "movie" | "tv" | "person";

const embedCache = new Map<string, string>();

const PROVIDERS = [
  "vidsrc.to",
  "vidsrc.xyz",
  "vidsrc.net",
  "vidsrc.vc",
  "vidsrc.pm",
  "vidsrc.in",
  "vidsrc.io",
];

// Heuristic markers that indicate provider failure pages
const INVALID_MARKERS = [
  "not found",
  "video not found",
  "file not found",
  "404",
  "error",
  "removed",
  "unavailable",
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

    // 1️⃣ Cache lookup
    const cached =
      embedCache.get(cacheKey) ?? localStorage.getItem(`embed:${cacheKey}`);

    if (cached) {
      embedCache.set(cacheKey, cached);
      setEmbedUrl(cached);
      return;
    }

    let iframe: HTMLIFrameElement | null = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);

    let index = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let resolved = false;

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

      const url = `https://${PROVIDERS[index]}/embed/${type}/${id}`;
      iframe.src = url;

      timeoutId = setTimeout(() => {
        index++;
        tryNext();
      }, 3000);
    };

    iframe.onload = () => {
      if (!iframe || resolved) return;

      try {
        const doc = iframe.contentDocument;
        const text = doc?.body?.innerText?.toLowerCase() ?? "";

        const invalid = INVALID_MARKERS.some((m) => text.includes(m));

        if (invalid) {
          index++;
          tryNext();
          return;
        }

        // ✅ Valid embed confirmed
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
      index++;
      tryNext();
    };

    tryNext();

    return cleanup;
  }, [id, type]);

  return embedUrl;
}
