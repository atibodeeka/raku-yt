"use client";

import { RakuTrack, useStore } from "@/lib/store";
import { formatTime } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { rateYouTubeVideo } from "@/lib/youtube-api";
import { FiPlay, FiHeart, FiMoreHorizontal } from "react-icons/fi";

interface TrackListProps {
  tracks: RakuTrack[];
  showRank?: boolean;
  likedIds?: Set<string>;
  onToggleLike?: (trackId: string, isLiked: boolean) => void;
}

export default function TrackList({
  tracks,
  showRank = false,
  likedIds,
  onToggleLike,
}: TrackListProps) {
  const accessToken = useStore((s) => s.accessToken);
  const provider = useStore((s) => s.provider);
  const setCurrentTrack = useStore((s) => s.setCurrentTrack);
  const setIsPlaying = useStore((s) => s.setIsPlaying);
  const setQueue = useStore((s) => s.setQueue);
  const addToYouTubeHistory = useStore((s) => s.addToYouTubeHistory);
  const setArtistPage = useStore((s) => s.setArtistPage);
  const setCurrentPage = useStore((s) => s.setCurrentPage);
  const language = useStore((s) => s.language);

  const handlePlay = async (track: RakuTrack, index: number) => {
    if (!accessToken) return;
    try {
      setQueue(tracks, index);
      setCurrentTrack(track);
      setIsPlaying(true);
      addToYouTubeHistory(track);
    } catch {
      // silently fail
    }
  };

  const handleLike = async (track: RakuTrack) => {
    if (!accessToken || !onToggleLike) return;
    const isLiked = likedIds?.has(track.id) ?? false;
    try {
      await rateYouTubeVideo(accessToken, track.id, isLiked ? "none" : "like");
      onToggleLike(track.id, !isLiked);
    } catch {
      // silently fail
    }
  };

  const handleArtistClick = (artist: { id: string; name: string }) => {
    if (!artist.id) return;
    setArtistPage({ id: artist.id, name: artist.name });
    setCurrentPage("artist");
  };

  return (
    <div className="w-full bg-white">
      {/* Table header - Melon style */}
      <div className="table-header flex items-center px-3 py-2 tracking-wider">
        {showRank && (
          <div className="w-10 text-center text-[11px] text-gray-500">
            {t("trackList.no", language)}
          </div>
        )}
        <div className="w-10" />
        <div className="flex-1 min-w-0 text-[11px] text-gray-500 pl-3">
          {t("trackList.title", language)}
        </div>
        <div className="w-16 text-center text-[11px] text-gray-500">
          {t("trackList.time", language)}
        </div>
        <div className="w-36 hidden md:block text-[11px] text-gray-500">
          {t("trackList.artist", language)}
        </div>
        <div className="w-36 hidden lg:block text-[11px] text-gray-500">
          {t("trackList.album", language)}
        </div>
        <div className="w-20 text-center text-[11px] text-gray-500">
          {t("trackList.actions", language)}
        </div>
      </div>

      {tracks.map((track, index) => {
        const isLiked = likedIds?.has(track.id) ?? false;
        const isEven = index % 2 === 0;
        return (
          <div
            key={`${track.id}-${index}`}
            className={`track-row flex items-center px-3 py-1.5 group cursor-pointer ${isEven ? "bg-white" : "bg-melon-tablealt"}`}
            onDoubleClick={() => handlePlay(track, index)}>
            {showRank && (
              <div className="w-10 text-center">
                <span
                  className={`rank-number text-sm ${index < 3 ? "text-melon-green font-bold" : "text-gray-400"}`}>
                  {index + 1}
                </span>
              </div>
            )}
            <div className="w-10 h-10 rounded bg-gray-100 overflow-hidden shrink-0 relative border border-gray-200">
              {track.album?.images?.[2]?.url ||
              track.album?.images?.[0]?.url ? (
                <img
                  src={track.album.images[2]?.url || track.album.images[0]?.url}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FiPlay size={12} className="text-gray-300" />
                </div>
              )}
              <button
                onClick={() => handlePlay(track, index)}
                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <FiPlay size={12} className="text-white ml-0.5" />
              </button>
            </div>
            <div className="flex-1 min-w-0 pl-3">
              <p className="text-[13px] text-gray-800 truncate font-medium">
                {track.name || t("trackList.unknown", language)}
              </p>
            </div>
            <div className="w-16 text-center">
              <span className="text-xs text-gray-500">
                {formatTime(track.duration_ms)}
              </span>
            </div>
            <div className="w-36 hidden md:block">
              <p className="text-xs text-gray-500 truncate">
                {track.artists?.map((a, i) => (
                  <span key={a.id || i}>
                    {i > 0 && ", "}
                    <button
                      onClick={() => handleArtistClick(a)}
                      className="hover:text-melon-green hover:underline transition-colors">
                      {a.name}
                    </button>
                  </span>
                ))}
              </p>
            </div>
            <div className="w-36 hidden lg:block">
              <p className="text-xs text-gray-500 truncate">
                {track.album?.name}
              </p>
            </div>
            <div className="w-20 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleLike(track)}
                className={`p-1 transition-colors ${isLiked ? "text-melon-accent" : "text-gray-400 hover:text-melon-accent"}`}>
                <FiHeart size={13} fill={isLiked ? "currentColor" : "none"} />
              </button>
              <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                <FiMoreHorizontal size={13} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
