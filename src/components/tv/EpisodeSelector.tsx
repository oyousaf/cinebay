"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FaPlay } from "react-icons/fa";
import type { Movie, Season, Episode } from "@/types/movie";
import axios from "axios";

/* ---------------------------------------------
   Types
--------------------------------------------- */

type Progress = {
  season: number;
  episode: number;
};

const progressKey = (id: number) => `tv-progress:${id}`;

/* ---------------------------------------------
   Component
--------------------------------------------- */

export default function EpisodeSelector({
  tv,
  onPlay,
}: {
  tv: Movie;
  onPlay: (season: number, episode: number) => void;
}) {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);

  /* ---------- Load progress ---------- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(progressKey(tv.id));
      if (raw) {
        const p = JSON.parse(raw) as Progress;
        setSeason(p.season);
        setEpisode(p.episode);
      }
    } catch {}
  }, [tv.id]);

  /* ---------- Load seasons (from details) ---------- */
  useEffect(() => {
    if (Array.isArray(tv.seasons)) {
      setSeasons(tv.seasons.filter((s) => s.season_number > 0));
    }
  }, [tv.seasons]);

  /* ---------- Fetch episodes (proxy) ---------- */
  useEffect(() => {
    if (!tv.id || !season) return;

    axios
      .get(`/api/tmdb/tv/${tv.id}/season/${season}?language=en-GB`)
      .then((res) => {
        if (Array.isArray(res.data?.episodes)) {
          setEpisodes(res.data.episodes);

          if (
            !res.data.episodes.some(
              (e: Episode) => e.episode_number === episode
            )
          ) {
            setEpisode(1);
          }
        }
      })
      .catch(() => {
        setEpisodes([]);
      });
  }, [tv.id, season, episode]);

  /* ---------- Play + persist ---------- */
  const play = (s: number, e: number) => {
    localStorage.setItem(
      progressKey(tv.id),
      JSON.stringify({ season: s, episode: e })
    );
    onPlay(s, e);
  };

  const hasProgress = season > 1 || episode > 1;

  /* ---------- UI ---------- */
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Episodes</h3>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => play(season, episode)}
          className="flex items-center gap-2 px-4 py-2 rounded-full
            bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
        >
          <FaPlay />
          {hasProgress ? `Continue S${season}E${episode}` : "Play S1E1"}
        </motion.button>
      </div>

      {/* Seasons */}
      <div className="flex gap-2 overflow-x-auto">
        {seasons.map((s) => (
          <button
            key={s.id}
            onClick={() => setSeason(s.season_number)}
            className={`px-3 py-1 rounded-full text-sm border
              ${
                season === s.season_number
                  ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
                  : "border-zinc-600 text-zinc-300"
              }`}
          >
            S{s.season_number}
          </button>
        ))}
      </div>

      {/* Episodes */}
      <div className="grid grid-cols-6 gap-2">
        {episodes.map((e) => (
          <button
            key={e.id}
            onClick={() => play(season, e.episode_number)}
            className={`text-xs rounded-md py-2
              ${
                episode === e.episode_number
                  ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
          >
            E{e.episode_number}
          </button>
        ))}
      </div>
    </div>
  );
}
