export const config = {
  runtime: "edge",
};

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/tmdb\//, "");
  const query = url.searchParams.toString();
  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) {
    return new Response("Missing TMDB API Key", { status: 500 });
  }

  const target = `https://api.themoviedb.org/3/${path}?${query}&api_key=${apiKey}`;

  try {
    const res = await fetch(target);
    const data = await res.json();

    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response("Error fetching from TMDB", { status: 500 });
  }
}
