"use client";

import { useEffect, useState, useCallback } from "react";
import { useStore, RakuTrack } from "@/lib/store";
import {
  getYouTubeChannelInfo,
  getYouTubePlaylistItems,
} from "@/lib/youtube-api";
import TrackList from "@/components/TrackList";
import Spinner from "@/components/ui/Spinner";
import { t } from "@/lib/i18n";
import { FiArrowLeft, FiUser, FiVideo } from "react-icons/fi";

interface ChannelInfo {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  subscriberCount: string;
  videoCount: string;
  uploadsPlaylistId: string;
}

export default function ArtistPage() {
  const artistPageData = useStore((s) => s.artistPageData);
  const setCurrentPage = useStore((s) => s.setCurrentPage);
  const accessToken = useStore((s) => s.accessToken);
  const language = useStore((s) => s.language);
  const [channelInfo, setChannelInfo] = useState<ChannelInfo | null>(null);
  const [tracks, setTracks] = useState<RakuTrack[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchArtist = useCallback(async () => {
    if (!artistPageData?.id) return;
    setLoading(true);
    try {
      const info = await getYouTubeChannelInfo(artistPageData.id);
      if (info) {
        setChannelInfo(info);
        // Fetch artist songs using the artist ID directly
        const songs = await getYouTubePlaylistItems(
          artistPageData.id,
          30,
          accessToken || undefined,
        );
        setTracks(songs);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [artistPageData, accessToken]);

  useEffect(() => {
    fetchArtist();
  }, [fetchArtist]);

  if (!artistPageData) {
    return (
      <div className="p-6 text-center py-20">
        <p className="text-gray-500 text-sm">
          {t("artist.noArtist", language)}
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
        {t("artist.back", language)}
      </button>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : (
        <>
          {/* Artist header */}
          <div className="flex items-center gap-5 mb-8">
            <div className="w-24 h-24 rounded-full bg-gray-100 overflow-hidden shrink-0 border-2 border-melon-green shadow-lg">
              {channelInfo?.thumbnail ? (
                <img
                  src={channelInfo.thumbnail}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FiUser size={32} className="text-gray-300" />
                </div>
              )}
            </div>
            <div>
              <h1
                className="text-xl font-bold text-gray-800 mb-1"
                style={{ fontFamily: "var(--font-round)" }}>
                {channelInfo?.name || artistPageData.name}
              </h1>
              {channelInfo?.description && (
                <p className="text-xs text-gray-400 mt-2 line-clamp-2 max-w-lg">
                  {channelInfo.description}
                </p>
              )}
            </div>
          </div>

          {/* Videos */}
          <section>
            <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <FiVideo size={14} className="text-melon-green" />
              {t("artist.popularSongs", language)}
            </h2>
            {tracks.length > 0 ? (
              <div className="border border-gray-200 rounded overflow-hidden">
                <TrackList tracks={tracks} showRank />
              </div>
            ) : (
              <p className="text-gray-500 text-sm text-center py-10">
                {t("artist.noVideos", language)}
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
