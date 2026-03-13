"use client";

import { useEffect, useState, useCallback } from "react";
import { useStore, RakuTrack } from "@/lib/store";
import { getRecentlyPlayed } from "@/lib/spotify-api";
import TrackList from "@/components/TrackList";
import Spinner from "@/components/ui/Spinner";
import PageHeader from "@/components/ui/PageHeader";
import { t } from "@/lib/i18n";
import { FiClock } from "react-icons/fi";

interface PlayHistoryItem {
  track: RakuTrack;
  played_at: string;
}

export default function HistoryPage() {
  const accessToken = useStore((s) => s.accessToken);
  const provider = useStore((s) => s.provider);
  const [tracks, setTracks] = useState<RakuTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const language = useStore((s) => s.language);

  const fetchHistory = useCallback(async () => {
    if (!accessToken) return;
    if (provider === "youtube") {
      try {
        const stored = localStorage.getItem("raku_yt_history");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setTracks(parsed);
          }
        }
      } catch {}
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getRecentlyPlayed(accessToken, 50);
      if (data?.items) {
        const items: PlayHistoryItem[] = data.items;
        setTracks(items.map((item) => item.track));
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [accessToken, provider]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

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
            {provider === "youtube"
              ? t("history.emptyYt", language)
              : t("history.empty", language)}
          </p>
          <p className="text-gray-400 text-xs mt-1">
            {t("history.emptyHint", language)}
          </p>
        </div>
      )}
    </div>
  );
}
