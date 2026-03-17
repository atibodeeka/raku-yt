// Zustand store for global app state
import { create } from "zustand";
import type { Language } from "./i18n";

export type Provider = "youtube";

// Unified track type for both providers
export interface RakuTrack {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: {
    id: string;
    name: string;
    images: { url: string; width: number; height: number }[];
  };
  duration_ms: number;
  uri: string;
  preview_url: string | null;
  provider: Provider;
  itemType?: "song" | "album" | "playlist";
}

export interface RakuUser {
  display_name: string;
  avatar: string;
}

interface PlayerState {
  // Provider
  provider: Provider | null;

  // Auth
  isLoggedIn: boolean;
  user: RakuUser | null;

  // Player
  currentTrack: RakuTrack | null;
  isPlaying: boolean;
  isLoadingTrack: boolean;
  progress: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: "off" | "context" | "track";

  // UI
  currentPage: string;
  searchQuery: string;

  // Settings
  language: Language;
  compactMode: boolean;

  // Queue & YouTube features
  queue: RakuTrack[];
  queueIndex: number;
  youtubeHistory: RakuTrack[];
  artistPageData: { id: string; name: string } | null;
  playlistPageData: { id: string; name: string; thumbnail: string } | null;
  ytPremium: boolean;

  // Actions
  setProvider: (provider: Provider | null) => void;
  setLoggedIn: (loggedIn: boolean) => void;
  setUser: (user: RakuUser | null) => void;
  clearAuth: () => void;
  setCurrentTrack: (track: RakuTrack | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setIsLoadingTrack: (loading: boolean) => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  setShuffle: (shuffle: boolean) => void;
  setRepeat: (repeat: "off" | "context" | "track") => void;
  setCurrentPage: (page: string) => void;
  setSearchQuery: (query: string) => void;
  setQueue: (tracks: RakuTrack[], startIndex?: number) => void;
  setQueueIndex: (index: number) => void;
  addToQueue: (track: RakuTrack) => void;
  removeFromQueue: (index: number) => void;
  addToYouTubeHistory: (track: RakuTrack) => void;
  setArtistPage: (data: { id: string; name: string } | null) => void;
  setPlaylistPage: (
    data: { id: string; name: string; thumbnail: string } | null,
  ) => void;
  setYtPremium: (premium: boolean) => void;

  // Settings actions
  setLanguage: (lang: Language) => void;
  setCompactMode: (compact: boolean) => void;

  // Toast notification
  toast: string | null;
  showToast: (message: string) => void;
  clearToast: () => void;
}

export const useStore = create<PlayerState>((set) => ({
  // Provider
  provider: null,

  // Auth
  isLoggedIn: false,
  user: null,

  // Player
  currentTrack: null,
  isPlaying: false,
  isLoadingTrack: false,
  progress: 0,
  duration: 0,
  volume: 50,
  shuffle: false,
  repeat: "off",

  // UI
  currentPage: "home",
  searchQuery: "",

  // Settings (load from localStorage)
  language:
    (typeof window !== "undefined"
      ? (localStorage.getItem("raku_lang") as Language)
      : null) || "ja",
  compactMode:
    typeof window !== "undefined"
      ? localStorage.getItem("raku_compact") === "true"
      : false,

  // Queue & YouTube features
  queue: [],
  queueIndex: -1,
  youtubeHistory: [],
  artistPageData: null,
  playlistPageData: null,
  ytPremium: false,
  toast: null,

  // Actions
  setProvider: (provider) => set({ provider }),
  setLoggedIn: (loggedIn) => set({ isLoggedIn: loggedIn }),
  setUser: (user) => set({ user }),
  clearAuth: () =>
    set({
      provider: null,
      isLoggedIn: false,
      user: null,
    }),
  setCurrentTrack: (track) => set({ currentTrack: track }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setIsLoadingTrack: (loading) => set({ isLoadingTrack: loading }),
  setProgress: (progress) => set({ progress }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume }),
  setShuffle: (shuffle) => set({ shuffle }),
  setRepeat: (repeat) => set({ repeat }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setQueue: (tracks, startIndex = 0) =>
    set({ queue: tracks, queueIndex: startIndex }),
  setQueueIndex: (index) => set({ queueIndex: index }),
  addToQueue: (track) => set((state) => ({ queue: [...state.queue, track] })),
  removeFromQueue: (index) =>
    set((state) => {
      const newQueue = state.queue.filter((_, i) => i !== index);
      let newQueueIndex = state.queueIndex;
      if (index < state.queueIndex) {
        newQueueIndex = Math.max(0, newQueueIndex - 1);
      } else if (index === state.queueIndex) {
        newQueueIndex = Math.min(newQueueIndex, newQueue.length - 1);
      }
      return { queue: newQueue, queueIndex: Math.max(-1, newQueueIndex) };
    }),
  addToYouTubeHistory: (track) =>
    set((state) => {
      const filtered = state.youtubeHistory.filter((t) => t.id !== track.id);
      const updated = [track, ...filtered].slice(0, 50);
      try {
        localStorage.setItem("raku_yt_history", JSON.stringify(updated));
      } catch {}
      return { youtubeHistory: updated };
    }),
  setArtistPage: (data) => set({ artistPageData: data }),
  setPlaylistPage: (data) => set({ playlistPageData: data }),
  setYtPremium: (premium) => set({ ytPremium: premium }),
  setLanguage: (lang) => {
    try {
      localStorage.setItem("raku_lang", lang);
    } catch {}
    set({ language: lang });
  },
  setCompactMode: (compact) => {
    try {
      localStorage.setItem("raku_compact", String(compact));
    } catch {}
    set({ compactMode: compact });
    // Notify Electron to resize
    if (typeof window !== "undefined" && window.electronAPI) {
      const api = window.electronAPI as {
        setCompactMode?: (compact: boolean) => void;
      };
      api.setCompactMode?.(compact);
    }
  },
  showToast: (message) => {
    set({ toast: message });
    setTimeout(() => set({ toast: null }), 3000);
  },
  clearToast: () => set({ toast: null }),
}));
