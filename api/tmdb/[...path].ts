export const config = { runtime: "edge" };

const TMDB_BASE = "https://api.themoviedb.org/3";

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

/*
  CORS headers
*/
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/*
  JSON helper
*/
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

export default async function handler(req: Request) {
  /*
    Handle CORS preflight
  */
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  if (req.method !== "GET") {
    return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return json({ error: "TMDB_API_KEY_MISSING" }, 500);
  }

  const { pathname, searchParams } = new URL(req.url);

  // Remove `/api/tmdb/`
  const segments = pathname.split("/").slice(3);

  if (!segments.length) {
    return json({ error: "INVALID_PATH" }, 400);
  }

  const root = segments[0];

  if (!ALLOWED_ROOTS.has(root)) {
    return json({ error: "PATH_NOT_ALLOWED" }, 403);
  }

  // Never allow client to override api_key
  searchParams.delete("api_key");

  const queryString = searchParams.toString();
  const targetUrl =
    `${TMDB_BASE}/${segments.join("/")}` +
    (queryString ? `?${queryString}&` : "?") +
    `api_key=${apiKey}`;

  let upstream: Response;

  try {
    upstream = await fetch(targetUrl, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    return json({ error: "UPSTREAM_FETCH_FAILED" }, 502);
  }

  let data: unknown;

  try {
    data = await upstream.json();
  } catch {
    return json({ error: "INVALID_UPSTREAM_JSON" }, 502);
  }

  if (!upstream.ok) {
    return json(
      {
        error: "TMDB_ERROR",
        status: upstream.status,
        details: data,
      },
      upstream.status,
    );
  }

  return json(data, 200);
}
