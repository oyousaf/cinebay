import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Movie } from "@/types/movie";

const embedCache = new Map<number, string>();

export function useVideoEmbed(movie: Movie, isPerson: boolean): string | null {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isPerson || !movie?.id) return;

    const localKey = `embedCache:${movie.id}`;
    const stored = localStorage.getItem(localKey);
    if (stored) {
      embedCache.set(movie.id, stored);
      setEmbedUrl(stored);
      return;
    }

    const domains = [
      "vidsrc.to",
      "vidsrc.xyz",
      "vidsrc.net",
      "vidsrc.vc",
      "vidsrc.pm",
      "vidsrc.in",
      "vidsrc.io",
    ];

    const iframe = document.createElement("iframe");
    let index = 0;
    let timeoutId: ReturnType<typeof setTimeout>;

    const tryNextDomain = () => {
      if (index >= domains.length) {
        toast.error("No working stream found.");
        return;
      }

      const url = `https://${domains[index]}/embed/${movie.media_type}/${movie.id}`;
      iframe.src = url;

      timeoutId = setTimeout(() => {
        index++;
        tryNextDomain();
      }, 4000);
    };

    iframe.style.display = "none";

    iframe.onload = () => {
      clearTimeout(timeoutId);

      setTimeout(() => {
        try {
          const doc = iframe.contentDocument || iframe.contentWindow?.document;
          const text = doc?.body?.innerText?.toLowerCase() || "";

          if (
            text.includes("this media is unavailable") ||
            doc?.title?.toLowerCase().includes("unavailable")
          ) {
            index++;
            tryNextDomain();
            return;
          }

          embedCache.set(movie.id, iframe.src);
          localStorage.setItem(localKey, iframe.src);
          setEmbedUrl(iframe.src);
        } catch {
          index++;
          tryNextDomain();
        }
      }, 1500);
    };

    iframe.onerror = () => {
      index++;
      tryNextDomain();
    };

    document.body.appendChild(iframe);
    tryNextDomain();

    return () => {
      clearTimeout(timeoutId);
      if (iframe && iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    };
  }, [movie, isPerson]);

  return embedUrl;
}
