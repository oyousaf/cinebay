import resolveMovie from "./vidsrc";
import { decrypt } from "./helpers/decoder";

export async function getMovieStreams(tmdbId: string) {
  try {
    const raw = await resolveMovie(tmdbId, "movie");
    return raw
      .filter((s) => s.stream)
      .map((s) => ({
        ...s,
        url: decrypt(s.stream, "GTAxQyTyBx"),
        subtitles: (s.subtitles || []).map((sub) => ({
          ...sub,
          url: decrypt(sub.url, "GuxKGDsA2T"),
        })),
      }));
  } catch (error) {
    console.error("❌ Failed to resolve movie streams:", error);
    return [];
  }
}
