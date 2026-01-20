import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type MediaType = "movie" | "tv";

/* -------------------------------------------------
   THEME (SINGLE SOURCE OF TRUTH)
-------------------------------------------------- */
const EMBED_THEME = {
  autoplay: 1,
  captions: 0,
  primaryColor: "2dd4bf",
  secondaryColor: "0f766e",
};

/* -------------------------------------------------
   PROVIDERS
-------------------------------------------------- */
const PROVIDERS = [
  { name: "vidlink", domain: "vidlink.pro" },
  { name: "vidsrc", domain: "vidsrc.to" },
  { name: "vidsrc", domain: "vidsrc.me" },
  { name: "vidsrc", domain: "vidsrc.cc" },
  { name: "vidsrc", domain: "vidsrc-embed.ru" },
  { name: "vidsrc", domain: "vidsrc-embed.su" },
  { name: "vidsrc", domain: "vidsrcme.su" },
  { name: "vidsrc", domain: "vsrc.su" },
];

/* -------------------------------------------------
   FAILURE MARKERS (VIDSRC)
-------------------------------------------------- */
const INVALID_MARKERS = [
  "not found",
  "video not found",
  "file not found",
  "404",
  "removed",
  "unavailable",
  "no stream",
];

/* -------------------------------------------------
   CACHE
-------------------------------------------------- */
const memoryCache = new Map<string, string>();

/* -------------------------------------------------
   HELPERS
-------------------------------------------------- */
function buildQuery(params: Record<string, string | number>) {
  return new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();
}

function buildEmbedUrl(
  provider: { name: string; domain: string },
  type: MediaType,
  id: number,
) {
  if (provider.name === "vidlink") {
    return `https://vidlink.pro/${type}/${id}?${buildQuery(EMBED_THEME)}`;
  }

  return `https://${provider.domain}/embed/${type}/${id}`;
}

function buildCacheKey(type: MediaType, id: number) {
  return `${type}:${id}:theme:${EMBED_THEME.primaryColor}`;
}

/* -------------------------------------------------
   HOOK
-------------------------------------------------- */
export function useVideoEmbed(id?: number, type?: MediaType): string | null {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const hasErroredRef = useRef(false);

  useEffect(() => {
    if (!id || !type) {
      setEmbedUrl(null);
      return;
    }

    const cacheKey = buildCacheKey(type, id);

    const cached =
      memoryCache.get(cacheKey) ?? localStorage.getItem(`embed:${cacheKey}`);

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
      iframe?.remove();
      iframe = null;
    };

    const tryNext = () => {
      if (!iframe || index >= PROVIDERS.length) {
        cleanup();

        if (!hasErroredRef.current) {
          hasErroredRef.current = true;
          toast.error("No streaming source available.");
        }
        return;
      }

      const provider = PROVIDERS[index];
      const url = buildEmbedUrl(provider, type, id);

      iframe.src = url;

      timeoutId = setTimeout(() => {
        index++;
        tryNext();
      }, 3000);
    };

    iframe.onload = () => {
      if (!iframe || resolved) return;

      if (PROVIDERS[index].name === "vidlink") {
        resolved = true;
        memoryCache.set(cacheKey, iframe.src);
        localStorage.setItem(`embed:${cacheKey}`, iframe.src);
        setEmbedUrl(iframe.src);
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
        localStorage.setItem(`embed:${cacheKey}`, iframe.src);
        setEmbedUrl(iframe.src);
        cleanup();
      } catch {
        resolved = true;
        memoryCache.set(cacheKey, iframe.src);
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
