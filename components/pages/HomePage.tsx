"use client";

import { useEffect, useState, useCallback } from "react";
import { useStore, RakuTrack } from "@/lib/store";
import { getYouTubeHomeSections, getYouTubeHistory } from "@/lib/youtube-api";
import TrackList from "@/components/TrackList";
import Spinner from "@/components/ui/Spinner";
import PageHeader from "@/components/ui/PageHeader";
import { t } from "@/lib/i18n";
import {
  FiTrendingUp,
  FiClock,
  FiPlay,
  FiList,
  FiMusic,
  FiChevronRight,
} from "react-icons/fi";

// Horizontal scrollable card for a track (Recently Played / Quick Picks)
function TrackCard({
  track,
  onPlay,
}: {
  track: RakuTrack;
  onPlay: () => void;
}) {
  const thumbnail = track.album?.images?.[0]?.url;
  const artistName = track.artists?.map((a) => a.name).join(", ") || "";

  return (
    <button
      onClick={onPlay}
      className="group shrink-0 w-40 rounded-lg overflow-hidden bg-white border border-gray-200 hover:shadow-md transition-shadow text-left">
      <div className="relative w-40 h-40 bg-gray-100">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FiMusic size={24} className="text-gray-300" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-melon-green flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
            <FiPlay size={16} className="text-white ml-0.5" />
          </div>
        </div>
      </div>
      <div className="p-2">
        <p className="text-[12px] font-medium text-gray-800 truncate">
          {track.name}
        </p>
        <p className="text-[11px] text-gray-500 truncate">{artistName}</p>
      </div>
    </button>
  );
}

// Horizontal scrollable card for a playlist/album
function PlaylistCard({
  track,
  onClick,
}: {
  track: RakuTrack;
  onClick: () => void;
}) {
  const thumbnail = track.album?.images?.[0]?.url;
  const artistName = track.artists?.map((a) => a.name).join(", ") || "";

  return (
    <button
      onClick={onClick}
      className="group shrink-0 w-44 rounded-lg overflow-hidden bg-white border border-gray-200 hover:shadow-md transition-shadow text-left">
      <div className="relative w-44 h-44 bg-gray-100">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FiList size={24} className="text-gray-300" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
      </div>
      <div className="p-2">
        <p className="text-[12px] font-medium text-gray-800 truncate">
          {track.name}
        </p>
        <p className="text-[11px] text-gray-500 truncate">{artistName}</p>
      </div>
    </button>
  );
}

export default function HomePage() {
  const language = useStore((s) => s.language);
  const setCurrentTrack = useStore((s) => s.setCurrentTrack);
  const setIsPlaying = useStore((s) => s.setIsPlaying);
  const setQueue = useStore((s) => s.setQueue);
  const addToYouTubeHistory = useStore((s) => s.addToYouTubeHistory);
  const setPlaylistPage = useStore((s) => s.setPlaylistPage);
  const setCurrentPage = useStore((s) => s.setCurrentPage);

  const [homeSections, setHomeSections] = useState<
    { title: string; tracks: RakuTrack[] }[]
  >([]);
  const [recentTracks, setRecentTracks] = useState<RakuTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sections, history] = await Promise.all([
        getYouTubeHomeSections(),
        getYouTubeHistory().catch(() => []),
      ]);
      setHomeSections(sections);
      setRecentTracks(history.slice(0, 20));
      if (sections.length === 0 && history.length === 0) {
        setError(t("home.fetchError", useStore.getState().language));
      }
    } catch (err) {
      console.error("ホームページデータ取得エラー:", err);
      setError(t("home.unexpectedError", useStore.getState().language));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Separate playlists/albums from song-only sections
  const playlistItems: RakuTrack[] = [];
  const songSections: { title: string; tracks: RakuTrack[] }[] = [];

  for (const section of homeSections) {
    const playlists = section.tracks.filter(
      (t) => t.itemType === "album" || t.itemType === "playlist",
    );
    const songs = section.tracks.filter(
      (t) => t.itemType !== "album" && t.itemType !== "playlist",
    );
    playlistItems.push(...playlists);
    if (songs.length > 0) {
      songSections.push({ title: section.title, tracks: songs });
    }
  }

  // Get first song section as "Quick Picks"
  const quickPicks = songSections.length > 0 ? songSections[0] : null;
  const remainingSections = songSections.slice(1);

  const handlePlayTrack = (track: RakuTrack, allTracks: RakuTrack[]) => {
    const idx = allTracks.findIndex((t) => t.id === track.id);
    setQueue(allTracks, idx >= 0 ? idx : 0);
    setCurrentTrack(track);
    setIsPlaying(true);
    addToYouTubeHistory(track);
  };

  const handlePlaylistClick = (track: RakuTrack) => {
    const thumbnail = track.album?.images?.[0]?.url || "";
    setPlaylistPage({ id: track.id, name: track.name, thumbnail });
    setCurrentPage("playlist");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        icon={FiTrendingUp}
        title={t("home.title", language)}
        subtitle={t("home.subtitle", language)}
      />

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          {error}
          <button
            onClick={fetchData}
            className="ml-3 text-xs text-melon-green hover:underline">
            {t("home.retry", language)}
          </button>
        </div>
      )}

      {/* Recently Played / Listen Again */}
      {recentTracks.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <FiClock size={14} className="text-melon-green" />
              {t("home.listenAgain", language)}
            </h2>
            <button
              onClick={() => setCurrentPage("history")}
              className="text-[11px] text-melon-green hover:underline flex items-center gap-0.5">
              {t("home.viewAll", language)}
              <FiChevronRight size={12} />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {recentTracks.map((track, i) => (
              <TrackCard
                key={`${track.id}-${i}`}
                track={track}
                onPlay={() => handlePlayTrack(track, recentTracks)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Playlists & Albums */}
      {playlistItems.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <FiList size={14} className="text-melon-green" />
            {t("home.yourPlaylists", language)}
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {playlistItems.map((track, i) => (
              <PlaylistCard
                key={`${track.id}-${i}`}
                track={track}
                onClick={() => handlePlaylistClick(track)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Quick Picks */}
      {quickPicks && quickPicks.tracks.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <FiMusic size={14} className="text-melon-green" />
            {t("home.quickPicks", language)}
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {quickPicks.tracks.slice(0, 20).map((track, i) => (
              <TrackCard
                key={`${track.id}-${i}`}
                track={track}
                onPlay={() => handlePlayTrack(track, quickPicks.tracks)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Remaining song sections (Top 50, etc.) as TrackList tables */}
      {remainingSections.map((section, idx) => (
        <section key={idx} className="mb-8">
          <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <FiTrendingUp size={14} className="text-melon-green" />
            {section.title}
          </h2>
          <div className="border border-gray-200 rounded overflow-hidden">
            <TrackList tracks={section.tracks} showRank />
          </div>
        </section>
      ))}
    </div>
  );
}
