"use client";

import { useEffect, useState, useCallback } from "react";
import { useStore } from "@/lib/store";
import { loadTokens } from "@/lib/auth-storage";
import { getCurrentUser } from "@/lib/spotify-api";
import { getYouTubeUserInfo } from "@/lib/youtube-api";
import {
  pause,
  play,
  seek,
  setRepeat as apiSetRepeat,
  setShuffle as apiSetShuffle,
  skipToNext,
  skipToPrevious,
} from "@/lib/spotify-api";
import { useYouTubePlayer } from "@/components/YouTubePlayer";
import TitleBar from "@/components/TitleBar";
import Sidebar from "@/components/Sidebar";
import Player from "@/components/Player";
import CompactPlayer from "@/components/CompactPlayer";
import LoginScreen from "@/components/LoginScreen";
import HomePage from "@/components/pages/HomePage";
import SearchPage from "@/components/pages/SearchPage";
import LikedSongsPage from "@/components/pages/LikedSongsPage";
import HistoryPage from "@/components/pages/HistoryPage";
import LyricsPage from "@/components/pages/LyricsPage";
import ArtistPage from "@/components/pages/ArtistPage";
import SettingsPage from "@/components/pages/SettingsPage";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const accessToken = useStore((s) => s.accessToken);
  const provider = useStore((s) => s.provider);
  const user = useStore((s) => s.user);
  const currentPage = useStore((s) => s.currentPage);
  const compactMode = useStore((s) => s.compactMode);
  const setUser = useStore((s) => s.setUser);
  const clearAuth = useStore((s) => s.clearAuth);

  // Shared playback controls for compact mode
  const isYouTube = provider === "youtube";
  const isSpotify = provider === "spotify";

  const playNextYouTube = useCallback(() => {
    const { queue, queueIndex, repeat, shuffle } = useStore.getState();
    if (queue.length === 0) return;
    let nextIndex: number;
    if (shuffle) {
      if (queue.length === 1) nextIndex = 0;
      else {
        do {
          nextIndex = Math.floor(Math.random() * queue.length);
        } while (nextIndex === queueIndex);
      }
    } else {
      nextIndex = queueIndex + 1;
      if (nextIndex >= queue.length) {
        if (repeat === "context") nextIndex = 0;
        else return;
      }
    }
    useStore.getState().setQueueIndex(nextIndex);
    useStore.getState().setCurrentTrack(queue[nextIndex]);
    useStore.getState().addToYouTubeHistory(queue[nextIndex]);
  }, []);

  const { ytPlay, ytPause, ytSeek } = useYouTubePlayer(playNextYouTube);

  const handlePlayPause = async () => {
    const { isPlaying } = useStore.getState();
    if (isYouTube) {
      if (isPlaying) ytPause();
      else ytPlay();
      return;
    }
    if (!accessToken) return;
    if (isPlaying) {
      await pause(accessToken);
      useStore.getState().setIsPlaying(false);
    } else {
      await play(accessToken);
      useStore.getState().setIsPlaying(true);
    }
  };

  const handlePrev = async () => {
    if (isYouTube) {
      const { queue, queueIndex, progress } = useStore.getState();
      if (progress > 3000 || queue.length === 0 || queueIndex <= 0) {
        ytSeek(0);
      } else {
        const prevIndex = queueIndex - 1;
        useStore.getState().setQueueIndex(prevIndex);
        useStore.getState().setCurrentTrack(queue[prevIndex]);
        useStore.getState().addToYouTubeHistory(queue[prevIndex]);
      }
      return;
    }
    if (!accessToken) return;
    await skipToPrevious(accessToken);
  };

  const handleNext = async () => {
    if (isYouTube) {
      playNextYouTube();
      return;
    }
    if (!accessToken) return;
    await skipToNext(accessToken);
  };

  const handleShuffle = async () => {
    const { shuffle } = useStore.getState();
    if (isYouTube) {
      useStore.getState().setShuffle(!shuffle);
      return;
    }
    if (!accessToken) return;
    useStore.getState().setShuffle(!shuffle);
    await apiSetShuffle(accessToken, !shuffle);
  };

  const handleRepeat = async () => {
    const { repeat } = useStore.getState();
    const states: ("off" | "context" | "track")[] = ["off", "context", "track"];
    const nextIdx = (states.indexOf(repeat) + 1) % states.length;
    const newState = states[nextIdx];
    useStore.getState().setRepeat(newState);
    if (isYouTube) return;
    if (!accessToken) return;
    await apiSetRepeat(accessToken, newState);
  };

  const handleSeek = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const pos = parseInt(e.target.value, 10);
    useStore.getState().setProgress(pos);
    if (isYouTube) {
      ytSeek(pos);
      return;
    }
    if (accessToken) await seek(accessToken, pos);
  };

  useEffect(() => {
    const stored = loadTokens();
    if (stored) {
      useStore.getState().setProvider(stored.provider);
      useStore
        .getState()
        .setAuth(stored.accessToken, stored.refreshToken, stored.tokenExpiry);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (accessToken && provider && !user) {
      const fetchUser =
        provider === "youtube"
          ? getYouTubeUserInfo(accessToken)
          : getCurrentUser(accessToken);
      fetchUser.then((userData) => setUser(userData)).catch(() => clearAuth());
    }
  }, [accessToken, provider, user, setUser, clearAuth]);

  if (!mounted) {
    return <div className="h-screen bg-melon-bg" />;
  }

  if (!accessToken) {
    return (
      <div className="h-screen flex flex-col">
        <TitleBar />
        <LoginScreen />
      </div>
    );
  }

  // Compact mode
  if (compactMode) {
    return (
      <CompactPlayer
        onPlayPause={handlePlayPause}
        onPrev={handlePrev}
        onNext={handleNext}
        onShuffle={handleShuffle}
        onRepeat={handleRepeat}
        onSeek={handleSeek}
      />
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case "search":
        return <SearchPage />;
      case "liked":
        return <LikedSongsPage />;
      case "history":
        return <HistoryPage />;
      case "lyrics":
        return <LyricsPage />;
      case "artist":
        return <ArtistPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-melon-bg">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">{renderPage()}</main>
      </div>
      <Player />
    </div>
  );
}
