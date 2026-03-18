"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import PageHeader from "@/components/ui/PageHeader";
import Spinner from "@/components/ui/Spinner";
import { FiMusic, FiExternalLink } from "react-icons/fi";

export default function LyricsPage() {
  const currentTrack = useStore((s) => s.currentTrack);
  const language = useStore((s) => s.language);
  const [lyrics, setLyrics] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchedId, setFetchedId] = useState<string | null>(null);

  const albumArt = currentTrack?.album?.images?.[0]?.url;
  const trackName = currentTrack?.name;
  const artistName = currentTrack?.artists?.map((a) => a.name).join(", ");

  // Fetch lyrics when track changes
  useEffect(() => {
    const videoId = currentTrack?.uri;
    if (!videoId || videoId === fetchedId) return;

    setLoading(true);
    setLyrics(null);
    setFetchedId(videoId);

    if (window.ytmusicAPI?.getLyrics) {
      window.ytmusicAPI
        .getLyrics(videoId)
        .then((result) => {
          if (currentTrack?.uri === videoId) {
            setLyrics(result);
          }
        })
        .catch(() => {
          setLyrics(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [currentTrack?.uri]);

  // We show track info and link to external lyrics sources.
  const searchQuery = currentTrack
    ? encodeURIComponent(
        `${trackName} ${artistName} ${t("lyrics.searchSuffix", language)}`,
      )
    : "";

  return (
    <div className="p-6 h-full flex flex-col">
      <PageHeader icon={FiMusic} title={t("lyrics.title", language)} />

      {currentTrack ? (
        <div className="flex-1 flex flex-col items-center">
          {/* Album art - large */}
          <div className="w-64 h-64 rounded-lg bg-gray-100 overflow-hidden mb-6 shadow-lg glow-green">
            {albumArt ? (
              <img
                src={albumArt}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <FiMusic size={48} className="text-gray-500" />
              </div>
            )}
          </div>

          {/* Track info */}
          <h2
            className="text-lg font-bold text-gray-800 mb-1 text-center"
            style={{ fontFamily: "var(--font-round)" }}>
            {trackName}
          </h2>
          <p className="text-sm text-gray-500 mb-2">{artistName}</p>
          <p className="text-xs text-gray-400 mb-8">
            {currentTrack.album?.name}
          </p>

          {/* Decorative */}
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px w-20 bg-gray-200" />
            <span className="text-gray-500 text-xs">
              {t("lyrics.divider", language)}
            </span>
            <div className="h-px w-20 bg-gray-200" />
          </div>

          {/* Lyrics content */}
          {loading ? (
            <div className="py-8">
              <Spinner />
            </div>
          ) : lyrics && lyrics.length > 0 ? (
            <div className="text-center max-w-lg w-full">
              <div className="text-sm text-gray-700 leading-loose whitespace-pre-line">
                {lyrics.map((line, i) => (
                  <p key={i} className="mb-1">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center max-w-md">
              <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                {t("lyrics.unavailable", language)
                  .split("\n")
                  .map((line, i) => (
                    <span key={i}>
                      {line}
                      {i === 0 && <br />}
                    </span>
                  ))}
              </p>

              <div className="flex flex-col gap-2">
                <a
                  href={`https://www.google.com/search?q=${searchQuery}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-retro inline-flex items-center justify-center gap-2 text-sm text-melon-green hover:text-white">
                  <FiExternalLink size={14} />
                  {t("lyrics.searchGoogle", language)}
                </a>
                <a
                  href={`https://www.uta-net.com/search/?Aession=&Keyword=${searchQuery}&Aession=&x=0&y=0`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-retro inline-flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-melon-green">
                  <FiExternalLink size={14} />
                  {t("lyrics.searchUtanet", language)}
                </a>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <FiMusic size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-sm">
              {t("lyrics.noTrack", language)}
            </p>
            <p className="text-gray-400 text-xs mt-1">
              {t("lyrics.noTrackHint", language)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
