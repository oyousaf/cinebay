"use client";

import { useEffect, useState } from "react";
import { FaPlay, FaChevronDown } from "react-icons/fa";
import type { Movie, Season, Episode } from "@/types/movie";
import { fetchSeasonEpisodes } from "@/lib/tmdb";

/* ---------------------------------------------
   Types
--------------------------------------------- */

type Progress = {
  season: number;
  episode: number;
  watchedAt: number;
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
  const [season, setSeason] = useState<number | null>(null);
  const [episode, setEpisode] = useState<number | null>(null);

  const [openSeason, setOpenSeason] = useState(false);
  const [openEpisode, setOpenEpisode] = useState(false);

  /* ---------- Load seasons ---------- */
  useEffect(() => {
    if (!Array.isArray(tv.seasons)) return;

    const valid = tv.seasons.filter((s) => s.season_number > 0);
    setSeasons(valid);

    if (!season && valid.length) {
      setSeason(valid[0].season_number);
    }
  }, [tv.seasons, season]);

  /* ---------- Load episodes (HELPER ONLY) ---------- */
  useEffect(() => {
    if (!tv.id || !season) return;

    setEpisodes([]);
    setEpisode(null);

    fetchSeasonEpisodes(tv.id, season).then((eps) => {
      if (!eps || eps.length === 0) {
        setEpisodes([]);
        return;
      }

      setEpisodes(eps);
      setEpisode(eps[0].episode_number);
    });
  }, [tv.id, season]);

  /* ---------- Play + persist ---------- */
  const play = () => {
    if (!season || !episode) return;

    const payload: Progress = {
      season,
      episode,
      watchedAt: Date.now(),
    };

    localStorage.setItem(progressKey(tv.id), JSON.stringify(payload));
    onPlay(season, episode);
  };

  /* ---------- UI ---------- */
  return (
    <div className="rounded-xl border border-emerald-500/40 bg-black/70 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-emerald-400 font-semibold">Episodes</span>

        <button
          onClick={play}
          disabled={!episode}
          className="flex items-center gap-2 px-4 py-2 rounded-full
            bg-emerald-500 text-black font-semibold disabled:opacity-40"
        >
          <FaPlay />
          {episode ? `Play S${season}E${episode}` : "Select episode"}
        </button>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-2 gap-3">
        {/* Season */}
        <div className="relative">
          <button
            onClick={() => setOpenSeason((v) => !v)}
            className="w-full flex items-center justify-between
              px-3 py-2 rounded-lg border border-emerald-500/40
              bg-black text-emerald-300"
          >
            {season ? `Season ${season}` : "Select season"}
            <FaChevronDown />
          </button>

          {openSeason && (
            <div
              className="absolute z-50 mt-1 w-full rounded-lg
              bg-black border border-emerald-500/40 shadow-xl"
            >
              {seasons.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSeason(s.season_number);
                    setOpenSeason(false);
                  }}
                  className="w-full px-3 py-2 text-left
                    text-emerald-300 hover:bg-emerald-500/10"
                >
                  Season {s.season_number}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Episode */}
        <div className="relative">
          <button
            onClick={() => episodes.length && setOpenEpisode((v) => !v)}
            disabled={!episodes.length}
            className="w-full flex items-center justify-between
              px-3 py-2 rounded-lg border border-emerald-500/40
              bg-black text-emerald-300 disabled:opacity-40"
          >
            {episode ? `Episode ${episode}` : "No episodes"}
            <FaChevronDown />
          </button>

          {openEpisode && (
            <div
              className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto
              rounded-lg bg-black border border-emerald-500/40 shadow-xl"
            >
              {episodes.map((e) => (
                <button
                  key={e.id}
                  onClick={() => {
                    setEpisode(e.episode_number);
                    setOpenEpisode(false);
                  }}
                  className="w-full px-3 py-2 text-left
                    text-emerald-300 hover:bg-emerald-500/10"
                >
                  Episode {e.episode_number}
                  {e.name && (
                    <span className="block text-xs text-emerald-400">
                      {e.name}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Empty state */}
      {season && episodes.length === 0 && (
        <div className="text-xs text-emerald-400 opacity-70">
          No regular episodes found for this season.
        </div>
      )}
    </div>
  );
}
