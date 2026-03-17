"use client";

import { useEffect, useState, useCallback } from "react";
import { useStore, RakuTrack } from "@/lib/store";
import { getYouTubeHistory } from "@/lib/youtube-api";
import TrackList from "@/components/TrackList";
import Spinner from "@/components/ui/Spinner";
import PageHeader from "@/components/ui/PageHeader";
import { t } from "@/lib/i18n";
import { FiClock } from "react-icons/fi";

export default function HistoryPage() {
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const currentPage = useStore((s) => s.currentPage);
  const [tracks, setTracks] = useState<RakuTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const language = useStore((s) => s.language);

  const fetchHistory = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    try {
      const ytTracks = await getYouTubeHistory();
      setTracks(ytTracks);
    } catch (err) {
      console.error("履歴取得エラー:", err);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  // Refetch every time user navigates to this page
  useEffect(() => {
    if (currentPage === "history") {
      fetchHistory();
    }
  }, [currentPage, fetchHistory]);

  return (
    <div className="p-6">
      <PageHeader
        icon={FiClock}
        title={t("history.title", language)}
        subtitle={t("history.subtitle", language)}
      />

      {/* Track list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : tracks.length > 0 ? (
        <div className="border border-gray-200 rounded overflow-hidden">
          <TrackList tracks={tracks} showRank />
        </div>
      ) : (
        <div className="text-center py-20">
          <FiClock size={40} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-sm">
            {t("history.emptyYt", language)}
          </p>
          <p className="text-gray-400 text-xs mt-1">
            {t("history.emptyHint", language)}
          </p>
        </div>
      )}
    </div>
  );
}
