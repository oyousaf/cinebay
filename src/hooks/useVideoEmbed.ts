import { useEffect, useState } from "react";
import { toast } from "sonner";

const embedCache = new Map<number, string>();

const domains = [
  "vidsrc.to",
  "vidsrc.xyz",
  "vidsrc.net",
  "vidsrc.vc",
  "vidsrc.pm",
  "vidsrc.in",
  "vidsrc.io",
];

export function useVideoEmbed(id?: number, type?: string) {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !type) return;

    const localKey = `embedCache:${id}`;
    const stored = localStorage.getItem(localKey);
    if (stored) {
      embedCache.set(id, stored);
      setEmbedUrl(stored);
      return;
    }

    let iframe: HTMLIFrameElement | null = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);

    let index = 0;
    let timeoutId: ReturnType<typeof setTimeout>;

    const tryNextDomain = () => {
      if (!iframe || index >= domains.length) {
        toast.error("No working stream found.");
        return;
      }

      const url = `https://${domains[index]}/embed/${type}/${id}`;
      iframe.src = url;

      timeoutId = setTimeout(() => {
        index++;
        tryNextDomain();
      }, 2500);
    };

    iframe.onload = () => {
      clearTimeout(timeoutId);
      if (!iframe) return;
      embedCache.set(id, iframe.src);
      localStorage.setItem(localKey, iframe.src);
      setEmbedUrl(iframe.src);
    };

    iframe.onerror = () => {
      index++;
      tryNextDomain();
    };

    tryNextDomain();

    return () => {
      clearTimeout(timeoutId);
      if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);
      iframe = null;
    };
  }, [id, type]);

  return embedUrl;
}
