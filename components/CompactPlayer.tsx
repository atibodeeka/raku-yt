"use client";

import { useState, useCallback } from "react";
import { useStore, RakuTrack } from "@/lib/store";
import { t } from "@/lib/i18n";
import { formatTime } from "@/lib/utils";
import { searchTracks } from "@/lib/spotify-api";
import { searchYouTubeTracks } from "@/lib/youtube-api";
import {
  FiPlay,
  FiPause,
  FiSkipBack,
  FiSkipForward,
  FiShuffle,
  FiRepeat,
  FiMaximize2,
  FiSearch,
  FiPlus,
  FiX,
  FiVolume2,
  FiVolumeX,
} from "react-icons/fi";
import { setVolume as apiSetVolume } from "@/lib/spotify-api";

interface CompactPlayerProps {
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onShuffle: () => void;
  onRepeat: () => void;
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

type CompactTab = "playlist" | "search";

export default function CompactPlayer({
  onPlayPause,
  onPrev,
  onNext,
  onShuffle,
  onRepeat,
  onSeek,
}: CompactPlayerProps) {
  const language = useStore((s) => s.language);
  const currentTrack = useStore((s) => s.currentTrack);
  const isPlaying = useStore((s) => s.isPlaying);
  const isLoadingTrack = useStore((s) => s.isLoadingTrack);
  const progress = useStore((s) => s.progress);
  const duration = useStore((s) => s.duration);
  const shuffle = useStore((s) => s.shuffle);
  const repeat = useStore((s) => s.repeat);
  const volume = useStore((s) => s.volume);
  const setVolume = useStore((s) => s.setVolume);
  const queue = useStore((s) => s.queue);
  const queueIndex = useStore((s) => s.queueIndex);
  const accessToken = useStore((s) => s.accessToken);
  const setCompactMode = useStore((s) => s.setCompactMode);
  const setCurrentTrack = useStore((s) => s.setCurrentTrack);
  const setIsPlaying = useStore((s) => s.setIsPlaying);
  const setQueue = useStore((s) => s.setQueue);
  const addToQueue = useStore((s) => s.addToQueue);
  const removeFromQueue = useStore((s) => s.removeFromQueue);
  const addToYouTubeHistory = useStore((s) => s.addToYouTubeHistory);
  const showToast = useStore((s) => s.showToast);
  const provider = useStore((s) => s.provider);

  const [activeTab, setActiveTab] = useState<CompactTab>("playlist");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<RakuTrack[]>([]);
  const [searching, setSearching] = useState(false);

  const handleVolumeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseInt(e.target.value, 10);
    setVolume(vol);
    if (provider !== "youtube" && accessToken) {
      await apiSetVolume(accessToken, vol);
    }
  };

  const handleTrackClick = (index: number) => {
    const track = queue[index];
    if (!track) return;
    setQueue(queue, index);
    setCurrentTrack(track);
    setIsPlaying(true);
    if (provider === "youtube") {
      addToYouTubeHistory(track);
    }
  };

  const handleRemoveTrack = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const trackName = queue[index]?.name;
    removeFromQueue(index);
    showToast(`${trackName} — ${t("compact.removed", language)}`);
  };

  const handleAddToQueue = (track: RakuTrack) => {
    addToQueue(track);
    showToast(`${track.name} — ${t("compact.added", language)}`);
  };

  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    try {
      if (provider === "youtube") {
        const tracks = await searchYouTubeTracks(q);
        setSearchResults(tracks);
      } else {
        if (!accessToken) return;
        const data = await searchTracks(accessToken, q);
        if (data?.tracks?.items) {
          setSearchResults(data.tracks.items);
        }
      }
    } catch {
      // silently fail
    } finally {
      setSearching(false);
    }
  }, [searchQuery, provider, accessToken]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="h-screen flex flex-col bg-[#1a1a1a] text-white select-none">
      {/* Title bar - compact */}
      <div className="titlebar-drag h-8 bg-[#111] flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-1.5">
          <span
            className="text-melon-green font-bold text-sm"
            style={{ fontFamily: "var(--font-round)" }}>
            ♪
          </span>
          <span className="text-white font-bold text-xs">楽</span>
        </div>
        <div className="titlebar-nodrag flex items-center gap-1">
          <button
            onClick={() => setCompactMode(false)}
            className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded transition-colors"
            title="Normal mode">
            <FiMaximize2 size={10} className="text-gray-400" />
          </button>
          {typeof window !== "undefined" && window.electronAPI && (
            <>
              <button
                onClick={() => window.electronAPI?.minimize()}
                className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded transition-colors">
                <span className="text-gray-400 text-xs">−</span>
              </button>
              <button
                onClick={() => window.electronAPI?.close()}
                className="w-6 h-6 flex items-center justify-center hover:bg-red-500/80 rounded transition-colors">
                <span className="text-gray-400 text-xs">×</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Controls row: small icons + big play button */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#111]">
        <div className="flex items-center gap-3">
          <button
            onClick={onShuffle}
            className={`p-1 transition-colors ${shuffle ? "text-melon-green" : "text-gray-500 hover:text-white"}`}>
            <FiShuffle size={14} />
          </button>
          <button
            onClick={onRepeat}
            className={`p-1 transition-colors relative ${repeat !== "off" ? "text-melon-green" : "text-gray-500 hover:text-white"}`}>
            <FiRepeat size={14} />
            {repeat === "track" && (
              <span className="absolute -top-1 -right-1 text-[7px] text-melon-green font-bold">
                1
              </span>
            )}
          </button>
          <button
            onClick={onPrev}
            className="text-gray-400 hover:text-white transition-colors">
            <FiSkipBack size={16} />
          </button>
          <button
            onClick={onNext}
            className="text-gray-400 hover:text-white transition-colors">
            <FiSkipForward size={16} />
          </button>
        </div>
        <button
          onClick={onPlayPause}
          disabled={isLoadingTrack}
          className="w-14 h-14 rounded-full bg-melon-green hover:bg-melon-darkgreen flex items-center justify-center shadow-lg transition-colors shrink-0 disabled:opacity-70">
          {isLoadingTrack ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <FiPause size={22} className="text-white" />
          ) : (
            <FiPlay size={22} className="text-white ml-0.5" />
          )}
        </button>
      </div>

      {/* Scrolling song name */}
      <div className="px-3 py-1 bg-[#111] overflow-hidden">
        <div className="compact-marquee">
          <span className="text-xs text-gray-300 whitespace-nowrap">
            {currentTrack?.name || t("player.noTrack", language)}
            {currentTrack?.artists &&
              ` — ${currentTrack.artists.map((a) => a.name).join(", ")}`}
          </span>
        </div>
      </div>

      {/* Progress */}
      <div className="px-3 pb-2 bg-[#111]">
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={progress}
          onChange={onSeek}
          className="w-full compact-range"
        />
        <div className="flex justify-between text-[9px] text-gray-500 mt-0.5">
          <span>{formatTime(progress)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        {/* Volume */}
        <div className="flex items-center gap-1.5 ml-auto mt-3 mr-[50px] w-24">
          <button className="text-gray-400">
            {volume === 0 ? <FiVolumeX size={10} /> : <FiVolume2 size={10} />}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={handleVolumeChange}
            className="flex-1 compact-range"
          />
        </div>
      </div>

      {/* Tabs: playlist / search */}
      <div className="flex items-center bg-[#222] border-t border-b border-gray-700">
        <button
          onClick={() => setActiveTab("playlist")}
          className={`flex-1 py-1.5 text-center text-[11px] font-medium transition-colors ${
            activeTab === "playlist"
              ? "text-melon-green border-b-2 border-melon-green"
              : "text-gray-500 hover:text-gray-300"
          }`}>
          {t("compact.currentPlaylist", language)}
        </button>
        <button
          onClick={() => setActiveTab("search")}
          className={`flex-1 py-1.5 text-center text-[11px] font-medium transition-colors flex items-center justify-center gap-1 ${
            activeTab === "search"
              ? "text-melon-green border-b-2 border-melon-green"
              : "text-gray-500 hover:text-gray-300"
          }`}>
          <FiSearch size={10} />
          {t("compact.search", language)}
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto bg-[#1a1a1a]">
        {activeTab === "playlist" ? (
          /* Queue list with remove buttons */
          queue.length > 0 ? (
            queue.map((track, index) => (
              <div
                key={`${track.id}-${index}`}
                onClick={() => handleTrackClick(index)}
                className={`w-full flex items-center gap-1.5 px-2 py-1.5 text-left transition-colors cursor-pointer group ${
                  index === queueIndex
                    ? "bg-melon-green/20 text-melon-green"
                    : "text-gray-300 hover:bg-white/5"
                }`}>
                <span
                  className={`w-5 text-right text-[11px] shrink-0 ${
                    index === queueIndex
                      ? "text-melon-green font-bold"
                      : "text-gray-500"
                  }`}>
                  {index + 1}
                </span>
                <span className="flex-1 text-[12px] truncate font-medium">
                  {track.name}
                </span>
                <span className="text-[10px] text-gray-500 shrink-0">
                  {formatTime(track.duration_ms)}
                </span>
                <button
                  onClick={(e) => handleRemoveTrack(e, index)}
                  className="p-0.5 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                  title="Remove">
                  <FiX size={12} />
                </button>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-600 text-xs">
                {t("compact.queue", language)}
              </p>
            </div>
          )
        ) : (
          /* Search tab */
          <div className="flex flex-col h-full">
            {/* Search input */}
            <div className="flex gap-1.5 p-2 bg-[#222] shrink-0">
              <div className="flex-1 relative">
                <FiSearch
                  size={12}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={t("compact.searchPlaceholder", language)}
                  className="w-full bg-[#333] border border-gray-600 rounded pl-7 pr-2 py-1.5 text-[11px] text-gray-200 placeholder-gray-500 focus:outline-none focus:border-melon-green transition-colors"
                />
              </div>
              <button
                onClick={handleSearch}
                className="px-2.5 py-1.5 bg-melon-green hover:bg-melon-darkgreen text-white text-[10px] rounded transition-colors font-medium shrink-0">
                {t("compact.search", language)}
              </button>
            </div>

            {/* Search results */}
            <div className="flex-1 overflow-y-auto">
              {searching ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-melon-green border-t-transparent rounded-full animate-spin" />
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((track, index) => {
                  const isInQueue = queue.some((q) => q.id === track.id);
                  return (
                    <div
                      key={`${track.id}-${index}`}
                      className="flex items-center gap-1.5 px-2 py-1.5 text-gray-300 hover:bg-white/5 transition-colors group">
                      <span className="w-5 text-right text-[11px] text-gray-500 shrink-0">
                        {index + 1}
                      </span>
                      <span className="flex-1 text-[12px] truncate font-medium">
                        {track.name}
                      </span>
                      <span className="text-[10px] text-gray-500 shrink-0">
                        {formatTime(track.duration_ms)}
                      </span>
                      <button
                        onClick={() => handleAddToQueue(track)}
                        className={`p-0.5 shrink-0 transition-all ${
                          isInQueue
                            ? "text-melon-green"
                            : "text-gray-600 hover:text-melon-green opacity-0 group-hover:opacity-100"
                        }`}
                        title="Add to queue">
                        <FiPlus size={13} />
                      </button>
                    </div>
                  );
                })
              ) : searchQuery.trim() ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-gray-600 text-xs">
                    {t("compact.noResults", language)}
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <FiSearch size={24} className="text-gray-700" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom status */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#111] border-t border-gray-700 shrink-0">
        <span className="text-[10px] text-gray-500">
          {queue.length > 0
            ? `${queueIndex + 1}${t("home.songs", language)} ${formatTime(progress)}`
            : "---"}
        </span>
        <span className="text-[10px] text-gray-500">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
