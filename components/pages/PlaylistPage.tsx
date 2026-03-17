"use client";

import { useEffect, useState, useCallback } from "react";
import { useStore, RakuTrack } from "@/lib/store";
import { getYouTubePlaylistItems } from "@/lib/youtube-api";
import TrackList from "@/components/TrackList";
import Spinner from "@/components/ui/Spinner";
import { t } from "@/lib/i18n";
import { FiArrowLeft, FiDisc, FiList } from "react-icons/fi";

export default function PlaylistPage() {
  const playlistPageData = useStore((s) => s.playlistPageData);
  const setCurrentPage = useStore((s) => s.setCurrentPage);
  const language = useStore((s) => s.language);
  const [tracks, setTracks] = useState<RakuTrack[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlaylist = useCallback(async () => {
    if (!playlistPageData?.id) return;
    setLoading(true);
    try {
      const items = await getYouTubePlaylistItems(playlistPageData.id, 50);
      setTracks(items);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [playlistPageData]);

  useEffect(() => {
    fetchPlaylist();
  }, [fetchPlaylist]);

  if (!playlistPageData) {
    return (
      <div className="p-6 text-center py-20">
        <p className="text-gray-500 text-sm">
          {t("playlist.noPlaylist", language)}
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Back button */}
      <button
        onClick={() => setCurrentPage("home")}
        className="flex items-center gap-2 text-gray-500 hover:text-melon-green transition-colors mb-4 text-sm">
        <FiArrowLeft size={14} />
        {t("playlist.back", language)}
      </button>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : (
        <>
          {/* Playlist header */}
          <div className="flex items-center gap-5 mb-8">
            <div className="w-24 h-24 rounded-lg bg-gray-100 overflow-hidden shrink-0 border-2 border-melon-green shadow-lg">
              {playlistPageData.thumbnail ? (
                <img
                  src={playlistPageData.thumbnail}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FiDisc size={32} className="text-gray-300" />
                </div>
              )}
            </div>
            <div>
              <h1
                className="text-xl font-bold text-gray-800 mb-1"
                style={{ fontFamily: "var(--font-round)" }}>
                {playlistPageData.name}
              </h1>
              <p className="text-xs text-gray-400">
                {tracks.length} {t("playlist.trackCount", language)}
              </p>
            </div>
          </div>

          {/* Tracks */}
          <section>
            <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <FiList size={14} className="text-melon-green" />
              {t("playlist.songs", language)}
            </h2>
            {tracks.length > 0 ? (
              <div className="border border-gray-200 rounded overflow-hidden">
                <TrackList tracks={tracks} showRank />
              </div>
            ) : (
              <p className="text-gray-500 text-sm text-center py-10">
                {t("playlist.empty", language)}
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
