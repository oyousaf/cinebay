type TVProgress = {
  season: number;
  episode: number;
  position: number;
  updatedAt: number;
};

const keyFor = (tvId: number) => `watch:tv:${tvId}`;

const MIN_RESUME_SECONDS = 30;

export function getTVProgress(tvId: number): TVProgress | null {
  try {
    const raw = localStorage.getItem(keyFor(tvId));
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    if (
      typeof parsed?.season === "number" &&
      typeof parsed?.episode === "number" &&
      typeof parsed?.position === "number" &&
      parsed.position >= MIN_RESUME_SECONDS
    ) {
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
}

export function setTVProgress(
  tvId: number,
  season: number,
  episode: number,
  position: number,
) {
  if (position < MIN_RESUME_SECONDS) return;

  const payload: TVProgress = {
    season,
    episode,
    position,
    updatedAt: Date.now(),
  };

  localStorage.setItem(keyFor(tvId), JSON.stringify(payload));
}

export function clearTVProgress(tvId: number) {
  localStorage.removeItem(keyFor(tvId));
}
