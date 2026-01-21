import { useEffect, useState, useMemo } from "react";
import { X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import {
  buildEmbedUrl,
  EMBED_PROVIDERS,
  type PlaybackIntent,
} from "@/lib/embed/buildEmbedUrl";
import { useContinueWatching } from "@/hooks/useContinueWatching";

export default function PlayerModal({
  intent,
  onClose,
}: {
  intent: PlaybackIntent;
  onClose: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [stillLoading, setStillLoading] = useState(false);

  const { setTVProgress } = useContinueWatching();

  /* ---------- Embed URL ---------- */
  const embedUrl = useMemo(() => {
    return buildEmbedUrl(EMBED_PROVIDERS[0], intent);
  }, [intent]);

  /* ---------- Loading guard ---------- */
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (!loaded) setStillLoading(true);
    }, 15000);
    return () => clearTimeout(t);
  }, [embedUrl, loaded]);

  /* ---------- On load side-effects ---------- */
  const handleLoad = () => {
    setLoaded(true);
    setError(false);

    if (
      intent.mediaType === "tv" &&
      typeof intent.season === "number" &&
      typeof intent.episode === "number"
    ) {
      setTVProgress(intent.tmdbId, intent.season, intent.episode);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key={embedUrl}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur"
      >
        <div className="relative w-full max-w-6xl aspect-video bg-black shadow-2xl rounded-xl overflow-hidden">
          {!loaded && !error && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-white gap-2 text-sm px-4 text-center">
              <Loader2 className="h-8 w-8 animate-spin" />
              {stillLoading && (
                <p className="pt-2 text-zinc-300 text-xs">
                  Still loading… Try another source if needed.
                </p>
              )}
            </div>
          )}

          {error ? (
            <div className="absolute inset-0 flex items-center justify-center text-white px-6 text-center text-sm">
              Sorry, the video could not be loaded.
            </div>
          ) : (
            <iframe
              src={embedUrl}
              className="w-full h-full border-none"
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
              referrerPolicy="no-referrer"
              onLoad={handleLoad}
              onError={() => setError(true)}
            />
          )}

          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-white z-20"
          >
            <X size={28} className="p-1 bg-black/60 rounded-full" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
