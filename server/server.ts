import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import cors from "cors";

/*
  Environment variables
*/
dotenv.config({ path: ".env.local" });
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

/*
  Strict CORS control
*/
const allowedOrigins = [
  "http://localhost:5173",
  process.env.VITE_API_URL,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET"],
    allowedHeaders: ["Content-Type"],
  }),
);

app.use(express.json());

/* ----------------------------------
   TMDB PROXY
---------------------------------- */
app.get("/api/tmdb/*", async (req, res) => {
  const TMDB_KEY = process.env.TMDB_KEY;

  if (!TMDB_KEY) {
    return res.status(500).json({ error: "Missing TMDB API key" });
  }

  const tmdbPath = (req.params as { [key: string]: string })[0];
  const query = req.url.split("?")[1] ?? "";
  const separator = query ? "&" : "";

  const url = `https://api.themoviedb.org/3/${tmdbPath}?${query}${separator}api_key=${TMDB_KEY}`;

  try {
    const { data } = await axios.get(url);
    res.status(200).json(data);
  } catch (err: any) {
    console.error("TMDB proxy error:", err.message);
    res.status(500).json({ error: "Failed to fetch from TMDB" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
