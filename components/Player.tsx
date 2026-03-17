"use client";

import { useState, useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { formatTime } from "@/lib/utils";
import { t } from "@/lib/i18n";
import {
  rateYouTubeSong,
  addToYouTubePlaylist,
  createYouTubePlaylist,
  getYouTubeLibraryPlaylists,
} from "@/lib/youtube-api";
import type { LibraryPlaylistItem } from "@/lib/youtube-api";
import {
  FiPlay,
  FiPause,
  FiSkipBack,
  FiSkipForward,
  FiShuffle,
  FiRepeat,
  FiVolume2,
  FiVolumeX,
  FiMusic,
  FiHeart,
  FiPlus,
  FiX,
} from "react-icons/fi";

interface PlayerProps {
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onShuffle: () => void;
  onRepeat: () => void;
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function Player({
  onPlayPause,
  onPrev,
  onNext,
  onShuffle,
  onRepeat,
  onSeek,
}: PlayerProps) {
  const currentTrack = useStore((s) => s.currentTrack);
  const isPlaying = useStore((s) => s.isPlaying);
  const isLoadingTrack = useStore((s) => s.isLoadingTrack);
  const progress = useStore((s) => s.progress);
  const duration = useStore((s) => s.duration);
  const volume = useStore((s) => s.volume);
  const shuffle = useStore((s) => s.shuffle);
  const repeat = useStore((s) => s.repeat);
  const setVolume = useStore((s) => s.setVolume);
  const setCurrentPage = useStore((s) => s.setCurrentPage);
  const setArtistPage = useStore((s) => s.setArtistPage);
  const toast = useStore((s) => s.toast);
  const showToast = useStore((s) => s.showToast);
  const language = useStore((s) => s.language);

  const [isLiked, setIsLiked] = useState(false);
  const [likingInProgress, setLikingInProgress] = useState(false);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [playlists, setPlaylists] = useState<LibraryPlaylistItem[]>([]);
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const playlistMenuRef = useRef<HTMLDivElement>(null);

  // Reset like state when track changes
  useEffect(() => {
    setIsLiked(false);
  }, [currentTrack?.id]);

  // Close playlist menu on outside click
  useEffect(() => {
    if (!showPlaylistMenu) return;
    const handler = (e: MouseEvent) => {
      if (
        playlistMenuRef.current &&
        !playlistMenuRef.current.contains(e.target as Node)
      ) {
        setShowPlaylistMenu(false);
        setShowCreateInput(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPlaylistMenu]);

  const handleLike = async () => {
    if (!currentTrack || likingInProgress) return;
    setLikingInProgress(true);
    const newRating = isLiked ? "INDIFFERENT" : "LIKE";
    const ok = await rateYouTubeSong(currentTrack.id, newRating);
    if (ok) {
      setIsLiked(!isLiked);
      showToast(isLiked ? "Removed from liked songs" : "Added to liked songs");
    } else {
      showToast("Failed to update like");
    }
    setLikingInProgress(false);
  };

  const handleOpenPlaylistMenu = async () => {
    if (showPlaylistMenu) {
      setShowPlaylistMenu(false);
      return;
    }
    const pls = await getYouTubeLibraryPlaylists();
    setPlaylists(pls);
    setShowPlaylistMenu(true);
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    if (!currentTrack) return;
    const ok = await addToYouTubePlaylist(playlistId, [currentTrack.id]);
    if (ok) {
      showToast("Added to playlist");
    } else {
      showToast("Failed to add to playlist");
    }
    setShowPlaylistMenu(false);
  };

  const handleCreatePlaylist = async () => {
    if (!currentTrack || !newPlaylistName.trim()) return;
    const playlistId = await createYouTubePlaylist(newPlaylistName.trim(), [
      currentTrack.id,
    ]);
    if (playlistId) {
      showToast(`Created "${newPlaylistName.trim()}" and added song`);
    } else {
      showToast("Failed to create playlist");
    }
    setNewPlaylistName("");
    setShowCreateInput(false);
    setShowPlaylistMenu(false);
  };

  const handleVolumeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseInt(e.target.value, 10);
    setVolume(vol);
  };

  const albumArt = currentTrack?.album?.images?.[0]?.url;

  return (
    <div className="relative">
      {/* Toast notification */}
      {toast && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-4 py-2 rounded-full shadow-lg whitespace-nowrap z-50 animate-fade-in">
          {toast}
        </div>
      )}
      <div className="h-20 bg-white border-t-2 border-melon-green flex items-center px-4 gap-4 shrink-0 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
        {/* Track info */}
        <div className="flex items-center gap-3 w-64 min-w-0">
          <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 border border-gray-200">
            {albumArt ? (
              <img
                src={albumArt}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <FiMusic size={18} className="text-gray-300" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage("lyrics")}
                className="block text-sm text-gray-800 truncate hover:underline max-w-[180px] font-medium">
                {currentTrack?.name || t("player.noTrack", language)}
              </button>
            </div>
            <p className="text-xs text-gray-500 truncate max-w-[180px]">
              {currentTrack?.artists?.map(
                (a: { id: string; name: string }, i: number) => (
                  <span key={a.id || i}>
                    {i > 0 && ", "}
                    <button
                      onClick={() => {
                        if (a.id) {
                          setArtistPage({ id: a.id, name: a.name });
                          setCurrentPage("artist");
                        }
                      }}
                      className="hover:text-melon-green hover:underline transition-colors">
                      {a.name}
                    </button>
                  </span>
                ),
              ) || "---"}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="flex items-center gap-4">
            <button
              onClick={onShuffle}
              className={`p-1 transition-colors ${shuffle ? "text-melon-green" : "text-gray-400 hover:text-gray-700"}`}>
              <FiShuffle size={14} />
            </button>
            <button
              onClick={onPrev}
              className="text-gray-500 hover:text-gray-800 transition-colors">
              <FiSkipBack size={16} />
            </button>
            <button
              onClick={onPlayPause}
              disabled={isLoadingTrack}
              className="w-9 h-9 rounded-full bg-melon-green hover:bg-melon-darkgreen flex items-center justify-center transition-colors shadow-md disabled:opacity-70">
              {isLoadingTrack ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <FiPause size={15} className="text-white" />
              ) : (
                <FiPlay size={15} className="text-white ml-0.5" />
              )}
            </button>
            <button
              onClick={onNext}
              className="text-gray-500 hover:text-gray-800 transition-colors">
              <FiSkipForward size={16} />
            </button>
            <button
              onClick={onRepeat}
              className={`p-1 transition-colors relative ${repeat !== "off" ? "text-melon-green" : "text-gray-400 hover:text-gray-700"}`}>
              <FiRepeat size={14} />
              {repeat === "track" && (
                <span className="absolute -top-1 -right-1 text-[8px] text-melon-green font-bold">
                  1
                </span>
              )}
            </button>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-2 w-full max-w-md">
            <span className="text-[10px] text-gray-400 w-10 text-right">
              {formatTime(progress)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={progress}
              onChange={onSeek}
              className="flex-1"
            />
            <span className="text-[10px] text-gray-400 w-10">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Volume + Actions */}
        <div className="flex items-center gap-3 w-auto">
          {/* Like button */}
          <button
            onClick={handleLike}
            disabled={!currentTrack || likingInProgress}
            className={`p-1 transition-colors ${isLiked ? "text-red-500" : "text-gray-400 hover:text-gray-700"} disabled:opacity-40`}
            title={isLiked ? "Remove like" : "Like"}>
            <FiHeart size={15} fill={isLiked ? "currentColor" : "none"} />
          </button>

          {/* Add to playlist button */}
          <div className="relative" ref={playlistMenuRef}>
            <button
              onClick={handleOpenPlaylistMenu}
              disabled={!currentTrack}
              className="p-1 text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-40"
              title="Add to playlist">
              <FiPlus size={15} />
            </button>

            {/* Playlist dropdown menu */}
            {showPlaylistMenu && (
              <div className="absolute bottom-8 right-0 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1 max-h-64 overflow-y-auto">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                  Add to playlist
                </div>
                {/* Create new playlist */}
                {showCreateInput ? (
                  <div className="px-3 py-1.5 flex gap-1">
                    <input
                      type="text"
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleCreatePlaylist()
                      }
                      placeholder="Playlist name..."
                      className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-melon-green"
                      autoFocus
                    />
                    <button
                      onClick={handleCreatePlaylist}
                      className="text-xs text-melon-green hover:text-melon-darkgreen font-medium px-1">
                      OK
                    </button>
                    <button
                      onClick={() => setShowCreateInput(false)}
                      className="text-gray-400 hover:text-gray-600">
                      <FiX size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCreateInput(true)}
                    className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50 flex items-center gap-2 text-melon-green font-medium">
                    <FiPlus size={12} />
                    New playlist
                  </button>
                )}
                <div className="border-t border-gray-100 my-1" />
                {playlists.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-gray-400">
                    No playlists found
                  </div>
                ) : (
                  playlists.map((pl) => (
                    <button
                      key={pl.playlistId}
                      onClick={() => handleAddToPlaylist(pl.playlistId)}
                      className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50 flex items-center gap-2 truncate">
                      {pl.thumbnail ? (
                        <img
                          src={pl.thumbnail}
                          alt=""
                          className="w-6 h-6 rounded object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center shrink-0">
                          <FiMusic size={10} className="text-gray-400" />
                        </div>
                      )}
                      <span className="truncate">{pl.name}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Volume */}
          <button className="text-gray-400">
            {volume === 0 ? <FiVolumeX size={14} /> : <FiVolume2 size={14} />}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={handleVolumeChange}
            className="flex-1"
          />
        </div>
      </div>
    </div>
  );
}
