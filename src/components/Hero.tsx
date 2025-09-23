import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface HeroProps {
  movieId?: number;
}

const Hero: React.FC<HeroProps> = ({ movieId }) => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch(
        `https://api.themoviedb.org/3/movie/603692?api_key=${
          import.meta.env.VITE_TMDB_KEY
        }&append_to_response=videos`
      );
      const json = await res.json();
      setData(json);
    };
    fetchData();
  }, [movieId]);

  if (!data) return null;

  const backdrop = `https://image.tmdb.org/t/p/original${data.backdrop_path}`;
  const poster = `https://image.tmdb.org/t/p/w500${data.poster_path}`;
  const trailer = data.videos?.results?.find((v: any) => v.type === "Trailer");

  return (
    <section className="relative h-[70vh] w-full overflow-hidden">
      {/* Backdrop */}
      <img
        src={backdrop}
        alt={data.title}
        className="absolute inset-0 w-full h-full object-cover brightness-50"
      />

      {/* Overlay Content */}
      <div className="relative z-10 h-full flex flex-col justify-center px-6 max-w-2xl">
        <motion.img
          src={poster}
          alt={data.title}
          className="w-48 mb-4 rounded-lg shadow-lg"
          whileHover={{ scale: 1.05 }}
        />
        <h2 className="text-3xl font-bold mb-2">{data.title}</h2>
        <p className="text-sm text-gray-300 line-clamp-3 mb-4">
          {data.overview}
        </p>

        <div className="flex gap-4">
          <button className="px-4 py-2 bg-red-600 rounded-md hover:bg-red-700">
            ▶ Play
          </button>
          <button className="px-4 py-2 bg-neutral-800 rounded-md hover:bg-neutral-700">
            More Info
          </button>
        </div>
      </div>

      {/* Autoplay trailer in background */}
      {trailer && (
        <iframe
          className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition"
          src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1&controls=0&loop=1`}
          title="Trailer"
        ></iframe>
      )}
    </section>
  );
};

export default Hero;
