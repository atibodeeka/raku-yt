"use client";

import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { redirectToSpotifyAuth } from "@/lib/spotify-auth";
import { redirectToYouTubeAuth } from "@/lib/youtube-auth";
import { FaSpotify, FaYoutube } from "react-icons/fa";

export default function LoginScreen() {
  const language = useStore((s) => s.language);
  const descParts = t("login.description", language).split("\n");

  return (
    <div className="flex-1 flex items-center justify-center bg-melon-header">
      <div className="text-center">
        {/* Logo */}
        <div className="mb-8">
          <h1
            className="text-6xl font-bold text-melon-green mb-2"
            style={{ fontFamily: "var(--font-round)" }}>
            楽
          </h1>
          <p className="text-melon-muted text-sm tracking-[0.3em]">
            RAKU PLAYER
          </p>
        </div>

        {/* Retro decorative line */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="h-px w-16 bg-gray-600" />
          <span className="text-gray-500 text-xs">♪</span>
          <div className="h-px w-16 bg-gray-600" />
        </div>

        {/* Description */}
        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
          {descParts.map((line, i) => (
            <span key={i}>
              {line}
              {i < descParts.length - 1 && <br />}
            </span>
          ))}
        </p>

        {/* Login buttons */}
        <div className="flex flex-col gap-3 items-center">
          <button
            onClick={() => redirectToSpotifyAuth()}
            className="w-64 inline-flex items-center justify-center gap-3 bg-[#1DB954] hover:bg-[#1ed760] text-white font-bold py-3 px-8 rounded-full transition-all hover:shadow-lg hover:shadow-[#1DB954]/20 active:scale-95">
            <FaSpotify size={20} />
            <span>{t("login.spotify", language)}</span>
          </button>

          <div className="flex items-center gap-3 my-1">
            <div className="h-px w-8 bg-gray-600" />
            <span className="text-gray-500 text-xs">
              {t("login.or", language)}
            </span>
            <div className="h-px w-8 bg-gray-600" />
          </div>

          <button
            onClick={() => redirectToYouTubeAuth()}
            className="w-64 inline-flex items-center justify-center gap-3 bg-[#FF0000] hover:bg-[#CC0000] text-white font-bold py-3 px-8 rounded-full transition-all hover:shadow-lg hover:shadow-[#FF0000]/20 active:scale-95">
            <FaYoutube size={20} />
            <span>{t("login.youtube", language)}</span>
          </button>
        </div>

        {/* Footer */}
        <p className="text-gray-600 text-xs mt-12">
          Powered by Spotify Web API &amp; YouTube Data API
        </p>
      </div>
    </div>
  );
}
