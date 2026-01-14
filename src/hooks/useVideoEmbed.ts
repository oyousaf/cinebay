import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type MediaType = "movie" | "tv" | "person";

/* -------------------------------------------------
   CACHE
-------------------------------------------------- */
const embedCache = new Map<string, string>();

/* -------------------------------------------------
   PROVIDERS (ORDER MATTERS)
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
   FAILURE MARKERS (VidSrc only)
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
   URL BUILDER
-------------------------------------------------- */
function buildUrl(
  provider: { name: string; domain: string },
  type: MediaType,
  id: number
) {
  if (provider.name === "vidlink") {
    return `https://vidlink.pro/${type}/${id}?autoplay=1&primaryColor=2dd4bf&secondaryColor=0f766e`;
  }

  return `https://${provider.domain}/embed/${type}/${id}`;
}

/* -------------------------------------------------
   HOOK
-------------------------------------------------- */
export function useVideoEmbed(id?: number, type?: MediaType): string | null {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const hasErroredRef = useRef(false);

  useEffect(() => {
    if (!id || !type || type === "person") {
      setEmbedUrl(null);
      return;
    }

    const cacheKey = `${type}:${id}`;

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
      const url = buildUrl(provider, type, id);

      console.log(`[useVideoEmbed] trying ${provider.domain}`);

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
        embedCache.set(cacheKey, iframe.src);
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
