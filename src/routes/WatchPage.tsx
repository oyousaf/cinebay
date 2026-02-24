import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import PlayerModal from "@/components/PlayerModal";
import type { PlaybackIntent } from "@/lib/embed/buildEmbedUrl";

/* ---------------------------------- HELPERS ---------------------------------- */

function getIntentKey(i: PlaybackIntent) {
  return i.mediaType === "tv"
    ? `${i.tmdbId}-s${i.season ?? 1}-e${i.episode ?? 1}`
    : `${i.tmdbId}-movie`;
}

/* ---------------------------------- COMPONENT ---------------------------------- */

export default function WatchPage() {
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();

  const [visible, setVisible] = useState(true);

  /* ---------------------------------- BODY LOCK ---------------------------------- */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  /* ---------------------------------- INTENT BUILD ---------------------------------- */
  const intent = useMemo<PlaybackIntent | null>(() => {
    const tmdbId = Number(params.tmdbId);
    if (!Number.isFinite(tmdbId) || tmdbId <= 0) return null;

    const season = params.season ? Number(params.season) : undefined;
    const episode = params.episode ? Number(params.episode) : undefined;

    if (
      season !== undefined &&
      episode !== undefined &&
      Number.isFinite(season) &&
      Number.isFinite(episode)
    ) {
      return { mediaType: "tv", tmdbId, season, episode };
    }

    return { mediaType: "movie", tmdbId };
  }, [params.tmdbId, params.season, params.episode]);

  /* If params invalid, return home safely */
  useEffect(() => {
    if (intent === null) {
      navigate("/", { replace: true });
    }
  }, [intent, navigate]);

  if (!intent) return null;

  const key = getIntentKey(intent);

  /* ---------------------------------- CLOSE STRATEGY ---------------------------------- */

  const handleClose = useCallback(() => {
    // Trigger exit animation
    setVisible(false);

    setTimeout(() => {
      const state = location.state as { from?: string } | null;

      // 1) Best case: explicit origin
      if (state?.from) {
        navigate(state.from, { replace: true });
        return;
      }

      // 2) React Router history index
      const historyState = window.history.state as { idx?: number } | null;
      if (
        historyState &&
        typeof historyState.idx === "number" &&
        historyState.idx > 0
      ) {
        navigate(-1);
        return;
      }

      // 3) Fallback
      navigate("/", { replace: true });
    }, 220);
  }, [navigate, location.state]);

  /* ---------------------------------- RENDER ---------------------------------- */

  return (
    <AnimatePresence mode="wait">
      {visible && (
        <PlayerModal key={key} intent={intent} onClose={handleClose} />
      )}
    </AnimatePresence>
  );
}
