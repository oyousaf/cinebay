type TVProgress = {
  season: number;
  episode: number;
  updatedAt: number;
};

const keyFor = (tvId: number) => `watch:tv:${tvId}`;

export function getTVProgress(tvId: number): TVProgress | null {
  try {
    const raw = localStorage.getItem(keyFor(tvId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.season === "number" &&
      typeof parsed?.episode === "number"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function setTVProgress(tvId: number, season: number, episode: number) {
  const payload: TVProgress = {
    season,
    episode,
    updatedAt: Date.now(),
  };
  localStorage.setItem(keyFor(tvId), JSON.stringify(payload));
}

export function clearTVProgress(tvId: number) {
  localStorage.removeItem(keyFor(tvId));
}
