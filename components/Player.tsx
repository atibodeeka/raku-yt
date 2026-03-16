"use client";

import { useCallback, useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { formatTime } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { useYouTubePlayer } from "@/components/YouTubePlayer";
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
} from "react-icons/fi";

export default function Player() {
  const accessToken = useStore((s) => s.accessToken);
  const provider = useStore((s) => s.provider);
  const currentTrack = useStore((s) => s.currentTrack);
  const isPlaying = useStore((s) => s.isPlaying);
  const isLoadingTrack = useStore((s) => s.isLoadingTrack);
  const progress = useStore((s) => s.progress);
  const duration = useStore((s) => s.duration);
  const volume = useStore((s) => s.volume);
  const shuffle = useStore((s) => s.shuffle);
  const repeat = useStore((s) => s.repeat);
  const setCurrentTrack = useStore((s) => s.setCurrentTrack);
  const setIsPlaying = useStore((s) => s.setIsPlaying);
  const setProgress = useStore((s) => s.setProgress);
  const setDuration = useStore((s) => s.setDuration);
  const setVolume = useStore((s) => s.setVolume);
  const setShuffle = useStore((s) => s.setShuffle);
  const setRepeat = useStore((s) => s.setRepeat);
  const setCurrentPage = useStore((s) => s.setCurrentPage);
  const setQueueIndex = useStore((s) => s.setQueueIndex);
  const addToYouTubeHistory = useStore((s) => s.addToYouTubeHistory);
  const setArtistPage = useStore((s) => s.setArtistPage);
  const toast = useStore((s) => s.toast);
  const language = useStore((s) => s.language);

  // Queue-based next track for YouTube
  const playNextYouTube = useCallback(() => {
    const { queue, queueIndex, repeat, shuffle } = useStore.getState();
    if (queue.length === 0) return;

    let nextIndex: number;
    if (shuffle) {
      if (queue.length === 1) {
        nextIndex = 0;
      } else {
        do {
          nextIndex = Math.floor(Math.random() * queue.length);
        } while (nextIndex === queueIndex);
      }
    } else {
      nextIndex = queueIndex + 1;
      if (nextIndex >= queue.length) {
        if (repeat === "context") {
          nextIndex = 0;
        } else {
          return;
        }
      }
    }

    useStore.getState().setQueueIndex(nextIndex);
    useStore.getState().setCurrentTrack(queue[nextIndex]);
    useStore.getState().addToYouTubeHistory(queue[nextIndex]);
  }, []);

  const { ytPlay, ytPause, ytSeek, ytSetVolume } =
    useYouTubePlayer(playNextYouTube);

  const handlePlayPause = async () => {
    if (isPlaying) ytPause();
    else ytPlay();
  };

  const handlePrev = async () => {
    const { queue, queueIndex, progress } = useStore.getState();
    if (progress > 3000 || queue.length === 0 || queueIndex <= 0) {
      ytSeek(0);
    } else {
      const prevIndex = queueIndex - 1;
      setQueueIndex(prevIndex);
      setCurrentTrack(queue[prevIndex]);
      addToYouTubeHistory(queue[prevIndex]);
    }
  };

  const handleNext = async () => {
    playNextYouTube();
  };

  const handleSeek = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const pos = parseInt(e.target.value, 10);
    setProgress(pos);
    ytSeek(pos);
  };

  const handleVolumeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseInt(e.target.value, 10);
    setVolume(vol);
    ytSetVolume(vol);
  };

  const handleShuffle = async () => {
    setShuffle(!shuffle);
  };

  const handleRepeat = async () => {
    const states: ("off" | "context" | "track")[] = ["off", "context", "track"];
    const nextIdx = (states.indexOf(repeat) + 1) % states.length;
    setRepeat(states[nextIdx]);
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
            <button
              onClick={() => setCurrentPage("lyrics")}
              className="block text-sm text-gray-800 truncate hover:underline max-w-[180px] font-medium">
              {currentTrack?.name || t("player.noTrack", language)}
            </button>
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
              onClick={handleShuffle}
              className={`p-1 transition-colors ${shuffle ? "text-melon-green" : "text-gray-400 hover:text-gray-700"}`}>
              <FiShuffle size={14} />
            </button>
            <button
              onClick={handlePrev}
              className="text-gray-500 hover:text-gray-800 transition-colors">
              <FiSkipBack size={16} />
            </button>
            <button
              onClick={handlePlayPause}
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
              onClick={handleNext}
              className="text-gray-500 hover:text-gray-800 transition-colors">
              <FiSkipForward size={16} />
            </button>
            <button
              onClick={handleRepeat}
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
              onChange={handleSeek}
              className="flex-1"
            />
            <span className="text-[10px] text-gray-400 w-10">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2 w-36">
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
