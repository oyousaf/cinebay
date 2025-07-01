export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  const { pathname, searchParams } = new URL(req.url);
  const pathSegments = pathname.split("/").slice(3);
  const tmdbPath = pathSegments.join("/");

  console.log("🧪 Incoming Path:", pathname);
  console.log("🔧 TMDB Path:", tmdbPath);
  console.log("🔍 Full URL:", `https://api.themoviedb.org/3/${tmdbPath}?${searchParams.toString()}`);

  const TMDB_API_KEY = process.env.TMDB_API_KEY;
  if (!TMDB_API_KEY) {
    return new Response("Missing TMDB API key", { status: 500 });
  }

  const url = `https://api.themoviedb.org/3/${tmdbPath}?${searchParams.toString()}&api_key=${TMDB_API_KEY}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (e) {
    return new Response("Failed to fetch TMDB", { status: 500 });
  }
}
