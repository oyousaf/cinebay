export const config = { runtime: "edge" };

const TMDB_BASE = "https://api.themoviedb.org/3";

/**
 * Explicitly allowed top-level TMDB routes.
 * Prevents open proxy abuse.
 */
const ALLOWED_ROOTS = new Set([
  "movie",
  "tv",
  "search",
  "person",
  "genre",
  "trending",
  "discover",
  "configuration",
]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export default async function handler(req: Request) {
  if (req.method !== "GET") {
    return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return json({ error: "TMDB_API_KEY_MISSING" }, 500);
  }

  const { pathname, searchParams } = new URL(req.url);

  const segments = pathname.split("/").slice(3);
  if (segments.length === 0) {
    return json({ error: "INVALID_PATH" }, 400);
  }

  const root = segments[0];
  if (!ALLOWED_ROOTS.has(root)) {
    return json({ error: "PATH_NOT_ALLOWED" }, 403);
  }

  searchParams.delete("api_key");

  const targetUrl =
    `${TMDB_BASE}/${segments.join("/")}?` +
    searchParams.toString() +
    `&api_key=${apiKey}`;

  let res: Response;
  try {
    res = await fetch(targetUrl, {
      headers: { Accept: "application/json" },
    });
  } catch {
    return json({ error: "UPSTREAM_FETCH_FAILED" }, 502);
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return json({ error: "INVALID_UPSTREAM_JSON" }, 502);
  }

  if (!res.ok) {
    return json(
      {
        error: "TMDB_ERROR",
        status: res.status,
        details: data,
      },
      res.status,
    );
  }

  return json(data, 200);
}
