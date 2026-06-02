"use client";

import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";

import { useNavigate, useParams, useLocation } from "react-router-dom";

import { AnimatePresence } from "framer-motion";

import type { PlaybackIntent } from "@/lib/embed/buildEmbedUrl";

/* ---------------------------------- LAZY PLAYER ---------------------------------- */

const PlayerModal = lazy(() => import("@/components/PlayerModal"));

/* ---------------------------------- HELPERS ---------------------------------- */

function getIntentKey(intent: PlaybackIntent) {
  return intent.mediaType === "tv"
    ? `${intent.tmdbId}-s${intent.season ?? 1}-e${intent.episode ?? 1}`
    : `${intent.tmdbId}-movie`;
}

/* ---------------------------------- COMPONENT ---------------------------------- */

export default function WatchPage() {
  const navigate = useNavigate();

  const params = useParams();

  const location = useLocation();

  const [visible, setVisible] = useState(true);

  /* ---------------------------------- BODY LOCK ---------------------------------- */

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  /* ---------------------------------- INTENT BUILD ---------------------------------- */

  const intent = useMemo<PlaybackIntent | null>(() => {
    const tmdbId = Number(params.tmdbId);

    if (!Number.isFinite(tmdbId) || tmdbId <= 0) {
      return null;
    }

    if (params.season && params.episode) {
      return {
        mediaType: "tv",
        tmdbId,
        season: Number(params.season),
        episode: Number(params.episode),
      };
    }

    return {
      mediaType: "movie",
      tmdbId,
    };
  }, [params.tmdbId, params.season, params.episode]);

  /* ---------------------------------- INVALID ROUTE REDIRECT ---------------------------------- */

  useEffect(() => {
    if (intent !== null) {
      return;
    }

    navigate("/", {
      replace: true,
    });
  }, [intent, navigate]);

  /* ---------------------------------- EARLY EXIT ---------------------------------- */

  if (!intent) {
    return null;
  }

  const key = getIntentKey(intent);

  /* ---------------------------------- NEXT EPISODE ---------------------------------- */

  const handlePlayNext = useCallback(
    (next: PlaybackIntent) => {
      if (next.mediaType === "tv") {
        navigate(`/watch/tv/${next.tmdbId}/${next.season}/${next.episode}`);

        return;
      }

      navigate(`/watch/movie/${next.tmdbId}`);
    },
    [navigate],
  );

  /* ---------------------------------- CLOSE ---------------------------------- */

  const handleClose = useCallback(() => {
    setVisible(false);

    window.setTimeout(() => {
      const state = location.state as {
        from?: string;
      } | null;

      if (state?.from) {
        navigate(state.from, {
          replace: true,
        });

        return;
      }

      const historyState = window.history.state as {
        idx?: number;
      } | null;

      if (
        historyState &&
        typeof historyState.idx === "number" &&
        historyState.idx > 0
      ) {
        navigate(-1);

        return;
      }

      navigate("/", {
        replace: true,
      });
    }, 220);
  }, [navigate, location.state]);

  /* ---------------------------------- RENDER ---------------------------------- */

  return (
    <AnimatePresence mode="wait">
      {visible && (
        <Suspense fallback={null}>
          <PlayerModal
            key={key}
            intent={intent}
            onClose={handleClose}
            onPlayNext={handlePlayNext}
          />
        </Suspense>
      )}
    </AnimatePresence>
  );
}
