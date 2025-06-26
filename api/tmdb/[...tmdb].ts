export const config = {
  runtime: "edge", 
};

export default async function handler(req: Request): Promise<Response> {
  const { pathname, search } = new URL(req.url);
  const tmdbPath = pathname.replace(/^\/api\/tmdb/, ""); 
  const TMDB_KEY = process.env.TMDB_KEY;

  if (!TMDB_KEY) {
    return new Response(JSON.stringify({ error: "Missing TMDB_KEY" }), {
      status: 500,
    });
  }

  const tmdbUrl = `https://api.themoviedb.org/3${tmdbPath}${search}`;
  const separator = tmdbUrl.includes("?") ? "&" : "?";
  const finalUrl = `${tmdbUrl}${separator}api_key=${TMDB_KEY}`;

  try {
    const res = await fetch(finalUrl, {
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Fetch failed" }), {
      status: 500,
    });
  }
}
