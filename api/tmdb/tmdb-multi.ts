export const config = { runtime: "edge" };

export default async function handler(request: Request) {
  const urlObj = new URL(request.url);
  const searchParams = urlObj.searchParams;
  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing TMDB API key" }), {
      status: 500,
    });
  }

  const tmdbUrl = new URL("https://api.themoviedb.org/3/search/multi");

  // Forward all query parameters
  searchParams.forEach((value, key) => {
    tmdbUrl.searchParams.set(key, value);
  });

  // Add the API key
  tmdbUrl.searchParams.set("api_key", apiKey);

  try {
    const res = await fetch(tmdbUrl.toString());
    if (!res.ok) throw new Error("TMDB response not OK");

    const data = await res.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("❌ TMDB multi-search failed:", err);
    return new Response(JSON.stringify({ error: "TMDB multi-search failed" }), {
      status: 500,
    });
  }
}
