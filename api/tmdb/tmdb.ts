export const config = { runtime: "edge" };

export default async function handler(request: Request) {
  try {
    const url = new URL(request.url);
    const pathMatch = url.pathname.match(/\/api\/tmdb\/([^/]+)\/([^/]+)?/);

    if (!pathMatch) {
      return new Response(JSON.stringify({ error: "Invalid path" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const [, category, id = ""] = pathMatch;
    const apiKey = process.env.TMDB_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing TMDB API key" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const tmdbUrl = new URL(`https://api.themoviedb.org/3/${category}/${id}`);
    url.searchParams.forEach((value, key) =>
      tmdbUrl.searchParams.set(key, value)
    );
    tmdbUrl.searchParams.set("api_key", apiKey);

    const tmdbRes = await fetch(tmdbUrl.toString());
    const data = await tmdbRes.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "TMDB fetch failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
