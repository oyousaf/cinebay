export const config = { runtime: "edge" };

export default async function handler(request: Request) {
  const urlObj = new URL(request.url);
  const pathname = urlObj.pathname;
  const [_, __, category, id] = pathname.split("/");
  const apiKey = process.env.TMDB_API_KEY;

  const tmdbUrl = new URL(`https://api.themoviedb.org/3/${category}/${id}`);
  urlObj.searchParams.forEach((value, key) => tmdbUrl.searchParams.set(key, value));
  tmdbUrl.searchParams.set("api_key", apiKey || "");

  try {
    const res = await fetch(tmdbUrl.toString());
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "TMDB fetch failed" }), {
      status: 500,
    });
  }
}