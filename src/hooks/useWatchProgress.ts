import { useState, useEffect } from "react";

interface Progress {
  season?: number;
  episode?: number;
}

export function useWatchProgress(mediaId: string) {
  const key = `watch-progress-${mediaId}`;
  const [progress, setProgress] = useState<Progress>({});

  useEffect(() => {
    const saved = localStorage.getItem(key);
    if (saved) setProgress(JSON.parse(saved));
  }, [key]);

  const updateProgress = (season: number, episode: number) => {
    const newProg = { season, episode };
    setProgress(newProg);
    localStorage.setItem(key, JSON.stringify(newProg));
  };

  return { progress, updateProgress };
}
