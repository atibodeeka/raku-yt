"use client";

import { useEffect, useState, useCallback } from "react";
import { useStore, RakuTrack } from "@/lib/store";
import { getYouTubeLikedSongs } from "@/lib/youtube-api";
import TrackList from "@/components/TrackList";
import Spinner from "@/components/ui/Spinner";
import { t } from "@/lib/i18n";
import { FiHeart } from "react-icons/fi";

export default function LikedSongsPage() {
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const currentPage = useStore((s) => s.currentPage);
  const [tracks, setTracks] = useState<RakuTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const language = useStore((s) => s.language);

  const fetchLiked = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    try {
      const ytTracks = await getYouTubeLikedSongs();
      setTracks(ytTracks);
      setTotal(ytTracks.length);
    } catch (err) {
      console.error("お気に入り取得エラー:", err);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  // Refetch every time user navigates to this page
  useEffect(() => {
    if (currentPage === "liked") {
      fetchLiked();
    }
  }, [currentPage, fetchLiked]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1
            className="text-lg font-bold text-gray-800 flex items-center gap-2"
            style={{ fontFamily: "var(--font-round)" }}>
            <FiHeart className="text-melon-accent" />
            {t("liked.title", language)}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {total} {t("home.songs", language)}
          </p>
        </div>
      </div>

      {/* Track list */}
      {loading && tracks.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : tracks.length > 0 ? (
        <div className="border border-gray-200 rounded overflow-hidden">
          <TrackList tracks={tracks} showRank />
        </div>
      ) : (
        <div className="text-center py-20">
          <FiHeart size={40} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-sm">{t("liked.empty", language)}</p>
          <p className="text-gray-400 text-xs mt-1">
            {t("liked.emptyHint", language)}
          </p>
        </div>
      )}
    </div>
  );
}
