"use client";

import { RakuTrack, useStore } from "@/lib/store";
import { formatTime } from "@/lib/utils";
import { t } from "@/lib/i18n";
import {
  FiPlay,
  FiMoreHorizontal,
  FiDisc,
  FiList,
  FiUser,
  FiVideo,
} from "react-icons/fi";

interface TrackListProps {
  tracks: RakuTrack[];
  showRank?: boolean;
}

export default function TrackList({
  tracks,
  showRank = false,
}: TrackListProps) {
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const setCurrentTrack = useStore((s) => s.setCurrentTrack);
  const setIsPlaying = useStore((s) => s.setIsPlaying);
  const setQueue = useStore((s) => s.setQueue);
  const addToYouTubeHistory = useStore((s) => s.addToYouTubeHistory);
  const setArtistPage = useStore((s) => s.setArtistPage);
  const setPlaylistPage = useStore((s) => s.setPlaylistPage);
  const setCurrentPage = useStore((s) => s.setCurrentPage);
  const language = useStore((s) => s.language);

  const isPlaylistItem = (track: RakuTrack) =>
    track.itemType === "album" || track.itemType === "playlist";

  const isNonPlayable = (track: RakuTrack) =>
    track.itemType === "album" ||
    track.itemType === "playlist" ||
    track.itemType === "artist";

  const handlePlay = async (track: RakuTrack, index: number) => {
    if (!isLoggedIn) return;
    // If this is an album/playlist, navigate to its page instead
    if (isPlaylistItem(track)) {
      handlePlaylistClick(track);
      return;
    }
    if (track.itemType === "artist") {
      handleArtistClick({ id: track.id, name: track.name });
      return;
    }
    try {
      // Filter out non-playable items for the queue
      const playableTracks = tracks.filter((t) => !isNonPlayable(t));
      const playableIndex = playableTracks.findIndex((t) => t.id === track.id);
      setQueue(playableTracks, playableIndex >= 0 ? playableIndex : 0);
      setCurrentTrack(track);
      setIsPlaying(true);
      addToYouTubeHistory(track);
    } catch {
      // silently fail
    }
  };

  const handlePlaylistClick = (track: RakuTrack) => {
    const thumbnail = track.album?.images?.[0]?.url || "";
    const id = track.id.startsWith("VL") ? track.id.slice(2) : track.id;
    setPlaylistPage({ id, name: track.name, thumbnail });
    setCurrentPage("playlist");
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
        <div className="w-10" />
      </div>

      {tracks.map((track, index) => {
        const isEven = index % 2 === 0;
        const isCollection = isPlaylistItem(track);
        const isArtist = track.itemType === "artist";
        const isVideo = track.itemType === "video";
        const isClickable = isCollection || isArtist;
        return (
          <div
            key={`${track.id}-${index}`}
            className={`track-row flex items-center px-3 py-1.5 group cursor-pointer ${isEven ? "bg-white" : "bg-melon-tablealt"}`}
            onDoubleClick={() => handlePlay(track, index)}
            onClick={
              isCollection
                ? () => handlePlaylistClick(track)
                : isArtist
                  ? () => handleArtistClick({ id: track.id, name: track.name })
                  : undefined
            }>
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
                  {isCollection ? (
                    track.itemType === "album" ? (
                      <FiDisc size={12} className="text-gray-300" />
                    ) : (
                      <FiList size={12} className="text-gray-300" />
                    )
                  ) : isArtist ? (
                    <FiUser size={12} className="text-gray-300" />
                  ) : (
                    <FiPlay size={12} className="text-gray-300" />
                  )}
                </div>
              )}
              {!isCollection && !isArtist && (
                <button
                  onClick={() => handlePlay(track, index)}
                  className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <FiPlay size={12} className="text-white ml-0.5" />
                </button>
              )}
            </div>
            <div className="flex-1 min-w-0 pl-3">
              <div className="flex items-center gap-2">
                <p className="text-[13px] text-gray-800 truncate font-medium">
                  {track.name || t("trackList.unknown", language)}
                </p>
                {isCollection && (
                  <span
                    className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      track.itemType === "album"
                        ? "bg-purple-100 text-purple-600"
                        : "bg-blue-100 text-blue-600"
                    }`}>
                    {track.itemType === "album"
                      ? t("trackList.album", language)
                      : t("trackList.playlist", language)}
                  </span>
                )}
                {isArtist && (
                  <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-green-100 text-green-600">
                    {t("trackList.artist", language)}
                  </span>
                )}
                {isVideo && (
                  <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-red-100 text-red-600">
                    <FiVideo size={10} className="inline mr-0.5" />
                    Video
                  </span>
                )}
              </div>
            </div>
            <div className="w-16 text-center">
              <span className="text-xs text-gray-500">
                {isCollection || isArtist ? "—" : formatTime(track.duration_ms)}
              </span>
            </div>
            <div className="w-36 hidden md:block">
              <p className="text-xs text-gray-500 truncate">
                {track.artists?.map((a, i) => (
                  <span key={a.id || i}>
                    {i > 0 && ", "}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArtistClick(a);
                      }}
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
            <div className="w-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {/* <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                <FiMoreHorizontal size={13} />
              </button> */}
            </div>
          </div>
        );
      })}
    </div>
  );
}
