export const config = { runtime: "edge" };

export default async function handler(request: Request) {
  const { searchParams } = new URL(request.url);
  const apiKey = process.env.TMDB_API_KEY;

  const url = new URL("https://api.themoviedb.org/3/search/multi");
  searchParams.forEach((value, key) => url.searchParams.set(key, value));
  url.searchParams.set("api_key", apiKey || "");

  try {
    const response = await fetch(url.toString());
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "TMDB multi-search failed" }), {
      status: 500,
    });
  }
}