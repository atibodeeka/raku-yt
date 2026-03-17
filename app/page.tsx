"use client";

import { useEffect, useState, useCallback } from "react";
import { useStore } from "@/lib/store";
import { loadLogin } from "@/lib/auth-storage";
import { checkYouTubeLogin, checkYouTubePremium } from "@/lib/youtube-auth";
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
import PlaylistPage from "@/components/pages/PlaylistPage";
import SettingsPage from "@/components/pages/SettingsPage";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const provider = useStore((s) => s.provider);
  const currentPage = useStore((s) => s.currentPage);
  const compactMode = useStore((s) => s.compactMode);

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
    if (isPlaying) ytPause();
    else ytPlay();
  };

  const handlePrev = async () => {
    const { queue, queueIndex, progress } = useStore.getState();
    if (progress > 3000 || queue.length === 0 || queueIndex <= 0) {
      ytSeek(0);
    } else {
      const prevIndex = queueIndex - 1;
      useStore.getState().setQueueIndex(prevIndex);
      useStore.getState().setCurrentTrack(queue[prevIndex]);
      useStore.getState().addToYouTubeHistory(queue[prevIndex]);
    }
  };

  const handleNext = async () => {
    playNextYouTube();
  };

  const handleShuffle = async () => {
    const { shuffle } = useStore.getState();
    useStore.getState().setShuffle(!shuffle);
  };

  const handleRepeat = async () => {
    const { repeat } = useStore.getState();
    const states: ("off" | "context" | "track")[] = ["off", "context", "track"];
    const nextIdx = (states.indexOf(repeat) + 1) % states.length;
    const newState = states[nextIdx];
    useStore.getState().setRepeat(newState);
  };

  const handleSeek = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const pos = parseInt(e.target.value, 10);
    useStore.getState().setProgress(pos);
    ytSeek(pos);
  };

  useEffect(() => {
    // Restore login state from localStorage
    const stored = loadLogin();
    if (stored) {
      useStore.getState().setProvider("youtube");
      useStore.getState().setLoggedIn(true);
      useStore.getState().setUser({
        display_name: stored.name,
        avatar: stored.avatar,
      });
    }
    // Also verify cookies still exist in session
    checkYouTubeLogin().then((hasCookies) => {
      if (stored && !hasCookies) {
        // Cookies were deleted externally — clear login
        useStore.getState().clearAuth();
      }
      if (hasCookies) {
        // Check actual premium status from the account
        checkYouTubePremium().then((isPremium) => {
          useStore.getState().setYtPremium(isPremium);
        });
      }
    });
    // Sync compact mode with Electron window on startup
    const { compactMode: savedCompact } = useStore.getState();
    if (savedCompact && window.electronAPI) {
      const api = window.electronAPI as {
        setCompactMode?: (c: boolean) => void;
      };
      api.setCompactMode?.(true);
    }

    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-screen bg-melon-bg" />;
  }

  if (!isLoggedIn) {
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
      case "playlist":
        return <PlaylistPage />;
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
      <Player
        onPlayPause={handlePlayPause}
        onPrev={handlePrev}
        onNext={handleNext}
        onShuffle={handleShuffle}
        onRepeat={handleRepeat}
        onSeek={handleSeek}
      />
    </div>
  );
}
