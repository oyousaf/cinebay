import type { MirrorCandidate, ResolvedStream } from "./types";

type ResolveFn = (mirror: MirrorCandidate) => Promise<ResolvedStream | null>;

export async function resolveWithFallbacks(
  mirrors: MirrorCandidate[],
  resolve: ResolveFn,
  timeoutMs = 6000
): Promise<ResolvedStream | null> {
  for (const mirror of mirrors.sort((a, b) => a.priority - b.priority)) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const result = await resolve(mirror);

      clearTimeout(timer);

      if (result) {
        return result;
      }
    } catch (err) {
      continue;
    }
  }

  return null;
}
