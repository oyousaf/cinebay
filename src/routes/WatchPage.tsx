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

    // TV route
    if (params.season && params.episode) {
      return {
        mediaType: "tv",
        tmdbId,
        season: Number(params.season),
        episode: Number(params.episode),
      };
    }

    // Movie route
    return {
      mediaType: "movie",
      tmdbId,
    };
  }, [params.tmdbId, params.season, params.episode]);

  useEffect(() => {
    if (intent === null) {
      navigate("/", { replace: true });
    }
  }, [intent, navigate]);

  if (!intent) return null;

  const key = getIntentKey(intent);

  /* ---------------------------------- NEXT EPISODE NAVIGATION ---------------------------------- */

  const handlePlayNext = useCallback(
    (next: PlaybackIntent) => {
      if (next.mediaType === "tv") {
        navigate(`/watch/tv/${next.tmdbId}/${next.season}/${next.episode}`);
        return;
      }

      if (next.mediaType === "movie") {
        navigate(`/watch/movie/${next.tmdbId}`);
      }
    },
    [navigate],
  );

  /* ---------------------------------- CLOSE STRATEGY ---------------------------------- */

  const handleClose = useCallback(() => {
    setVisible(false);

    setTimeout(() => {
      const state = location.state as { from?: string } | null;

      if (state?.from) {
        navigate(state.from, { replace: true });
        return;
      }

      const historyState = window.history.state as { idx?: number } | null;
      if (
        historyState &&
        typeof historyState.idx === "number" &&
        historyState.idx > 0
      ) {
        navigate(-1);
        return;
      }

      navigate("/", { replace: true });
    }, 220);
  }, [navigate, location.state]);

  /* ---------------------------------- RENDER ---------------------------------- */

  return (
    <AnimatePresence mode="wait">
      {visible && (
        <PlayerModal
          key={key}
          intent={intent}
          onClose={handleClose}
          onPlayNext={handlePlayNext}
        />
      )}
    </AnimatePresence>
  );
}
