"use client";

import { useEffect, useMemo, useState } from "react";
import { FaPlay, FaChevronDown } from "react-icons/fa";

import type { Movie, Season, Episode } from "@/types/movie";
import { fetchSeasonEpisodes } from "@/lib/tmdb";
import { useContinueWatching } from "@/hooks/useContinueWatching";
import type { PlaybackIntent } from "@/lib/embed/buildEmbedUrl";

interface Props {
  tv: Movie;
  onPlay: (intent: PlaybackIntent) => void;
}

export default function EpisodeSelector({ tv, onPlay }: Props) {
  const { getTVProgress } = useContinueWatching();

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);

  const [season, setSeason] = useState<number | null>(null);
  const [episode, setEpisode] = useState<number | null>(null);

  const [openSeason, setOpenSeason] = useState(false);
  const [openEpisode, setOpenEpisode] = useState(false);

  /* ---------- RESUME (DERIVED, ALWAYS CURRENT) ---------- */
  const resume = useMemo(() => {
    return getTVProgress(tv.id);
  }, [tv.id, getTVProgress]);

  /* ---------- INITIAL SEASON / EPISODE ---------- */
  useEffect(() => {
    if (!Array.isArray(tv.seasons)) return;

    const validSeasons = tv.seasons.filter((s) => s.season_number > 0);
    setSeasons(validSeasons);

    if (resume) {
      setSeason(resume.season);
      setEpisode(resume.episode);
    } else if (validSeasons.length) {
      setSeason(validSeasons[0].season_number);
      setEpisode(null);
    }
  }, [tv.id, tv.seasons, resume]);

  /* ---------- LOAD EPISODES ---------- */
  useEffect(() => {
    if (!season) return;

    let active = true;
    setEpisodes([]);

    fetchSeasonEpisodes(tv.id, season).then((eps) => {
      if (!active || !Array.isArray(eps) || eps.length === 0) return;

      setEpisodes(eps);

      if (!episode || !eps.some((e) => e.episode_number === episode)) {
        setEpisode(eps[0].episode_number);
      }
    });

    return () => {
      active = false;
    };
  }, [tv.id, season]);

  /* ---------- PLAY ---------- */
  const play = () => {
    if (!season || !episode) return;

    onPlay({
      mediaType: "tv",
      tmdbId: tv.id,
      season,
      episode,
    });
  };

  /* ---------- LABEL ---------- */
  const isResume = resume?.season === season && resume?.episode === episode;

  const playLabel =
    season && episode
      ? isResume
        ? `Resume S${season} · E${episode}`
        : `S${season} · E${episode}`
      : "Select episode";

  /* ---------- UI ---------- */
  return (
    <div
      className="rounded-xl border border-[hsl(var(--foreground)/0.4)]
      bg-[hsl(var(--background)/0.85)] p-4 space-y-4"
    >
      <div className="flex items-center justify-center">
        <button
          onClick={play}
          disabled={!episode}
          className="flex items-center gap-2 px-4 py-2 rounded-full font-semibold
            bg-[hsl(var(--foreground))] text-[hsl(var(--background))]
            disabled:opacity-40"
        >
          <FaPlay />
          {playLabel}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Season */}
        <div className="relative">
          <button
            onClick={() => setOpenSeason((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg
              border border-[hsl(var(--foreground)/0.4)]
              bg-[hsl(var(--background))]"
          >
            {season ? `Season ${season}` : "Select season"}
            <FaChevronDown />
          </button>

          {openSeason && (
            <div
              className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto
              rounded-lg shadow-xl bg-[hsl(var(--background))]
              border border-[hsl(var(--foreground)/0.4)]"
            >
              {seasons.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSeason(s.season_number);
                    setOpenSeason(false);
                  }}
                  className="w-full px-3 py-2 text-left
                    hover:bg-[hsl(var(--foreground)/0.1)]"
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
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg
              border border-[hsl(var(--foreground)/0.4)]
              bg-[hsl(var(--background))]
              disabled:opacity-40"
          >
            {episode ? `Episode ${episode}` : "No episodes"}
            <FaChevronDown />
          </button>

          {openEpisode && (
            <div
              className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto
              rounded-lg shadow-xl bg-[hsl(var(--background))]
              border border-[hsl(var(--foreground)/0.4)]"
            >
              {episodes.map((e) => (
                <button
                  key={e.id}
                  onClick={() => {
                    setEpisode(e.episode_number);
                    setOpenEpisode(false);
                  }}
                  className="w-full px-3 py-2 text-left
                    hover:bg-[hsl(var(--foreground)/0.1)]"
                >
                  Episode {e.episode_number}
                  {e.name && (
                    <span className="block text-xs opacity-70">{e.name}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {season && episodes.length === 0 && (
        <div className="text-xs opacity-70">
          No regular episodes found for this season.
        </div>
      )}
    </div>
  );
}
