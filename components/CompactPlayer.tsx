"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useStore, RakuTrack } from "@/lib/store";
import { t } from "@/lib/i18n";
import { formatTime } from "@/lib/utils";
import {
  searchYouTubeAll,
  SearchFilter,
  parseYouTubeUrl,
  createTrackFromVideoId,
  rateYouTubeSong,
  addToYouTubePlaylist,
  createYouTubePlaylist,
  getYouTubeLibraryPlaylists,
} from "@/lib/youtube-api";
import type { LibraryPlaylistItem } from "@/lib/youtube-api";
import { TranslationKey } from "@/lib/i18n";
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
  FiHeart,
  FiMusic,
  FiTrash2,
  FiChevronUp,
  FiChevronDown,
} from "react-icons/fi";

interface CompactPlayerProps {
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onShuffle: () => void;
  onRepeat: () => void;
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

type CompactTab = "playlist" | "search";

const COMPACT_FILTERS: { key: SearchFilter; labelKey: TranslationKey }[] = [
  { key: "all", labelKey: "compact.filterAll" },
  { key: "songs", labelKey: "compact.filterSongs" },
  { key: "videos", labelKey: "compact.filterVideos" },
  { key: "albums", labelKey: "compact.filterAlbums" },
  { key: "artists", labelKey: "compact.filterArtists" },
  { key: "playlists", labelKey: "compact.filterPlaylists" },
  { key: "youtube", labelKey: "compact.filterYouTube" },
];

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
  const setCompactMode = useStore((s) => s.setCompactMode);
  const setCurrentTrack = useStore((s) => s.setCurrentTrack);
  const setIsPlaying = useStore((s) => s.setIsPlaying);
  const setQueue = useStore((s) => s.setQueue);
  const addToQueue = useStore((s) => s.addToQueue);
  const removeFromQueue = useStore((s) => s.removeFromQueue);
  const addToYouTubeHistory = useStore((s) => s.addToYouTubeHistory);
  const showToast = useStore((s) => s.showToast);
  const provider = useStore((s) => s.provider);

  const ytPremium = useStore((s) => s.ytPremium);

  const [activeTab, setActiveTab] = useState<CompactTab>("playlist");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<RakuTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchFilter, setSearchFilter] = useState<SearchFilter>("all");

  // Lyrics state
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyricsPosition, setLyricsPosition] = useState<"left" | "right">(
    "right",
  );
  const [lyrics, setLyrics] = useState<string[] | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsFetchedId, setLyricsFetchedId] = useState<string | null>(null);

  // Like state
  const [isLiked, setIsLiked] = useState(false);
  const [likingInProgress, setLikingInProgress] = useState(false);

  // Playlist menu state
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

  // Fetch lyrics when track changes
  useEffect(() => {
    const videoId = currentTrack?.uri;
    if (!videoId || videoId === lyricsFetchedId) return;

    setLyricsLoading(true);
    setLyrics(null);
    setLyricsFetchedId(videoId);

    if (window.ytmusicAPI?.getLyrics) {
      window.ytmusicAPI
        .getLyrics(videoId)
        .then((result) => {
          if (currentTrack?.uri === videoId) {
            setLyrics(result);
            // Update external lyrics window if open
            if (showLyrics && window.electronAPI?.updateLyricsContent) {
              const lyricsText = result ? result.join("\n") : "";
              window.electronAPI.updateLyricsContent({
                lyrics: lyricsText,
                trackName: currentTrack?.name || "",
                artistName:
                  currentTrack?.artists?.map((a) => a.name).join(", ") || "",
              });
            }
          }
        })
        .catch(() => {
          setLyrics(null);
        })
        .finally(() => {
          setLyricsLoading(false);
        });
    } else {
      setLyricsLoading(false);
    }
  }, [currentTrack?.uri]);

  // Listen for lyrics window closed by user
  useEffect(() => {
    if (!window.electronAPI?.onLyricsWindowClosed) return;
    window.electronAPI.onLyricsWindowClosed(() => {
      setShowLyrics(false);
    });
  }, []);

  // Toggle lyrics popup window
  const handleToggleLyrics = () => {
    if (showLyrics) {
      // Close external window
      window.electronAPI?.closeLyricsWindow?.();
      setShowLyrics(false);
    } else {
      // Open external window
      const lyricsText = lyrics ? lyrics.join("\n") : "";
      window.electronAPI?.openLyricsWindow?.({
        position: lyricsPosition,
        lyrics: lyricsText,
        trackName: currentTrack?.name || "",
        artistName: currentTrack?.artists?.map((a) => a.name).join(", ") || "",
      });
      setShowLyrics(true);
    }
  };

  // Toggle lyrics position (close and reopen on other side)
  const handleToggleLyricsPosition = () => {
    const newPos = lyricsPosition === "left" ? "right" : "left";
    setLyricsPosition(newPos);
    if (showLyrics) {
      window.electronAPI?.closeLyricsWindow?.();
      setTimeout(() => {
        const lyricsText = lyrics ? lyrics.join("\n") : "";
        window.electronAPI?.openLyricsWindow?.({
          position: newPos,
          lyrics: lyricsText,
          trackName: currentTrack?.name || "",
          artistName:
            currentTrack?.artists?.map((a) => a.name).join(", ") || "",
        });
      }, 100);
    }
  };

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

  const handleSearch = useCallback(
    async (query?: string, filter?: SearchFilter) => {
      const q = (query ?? searchQuery).trim();
      const f = filter ?? searchFilter;
      if (!q) return;

      // Check if the query is a YouTube URL
      const videoId = parseYouTubeUrl(q);
      if (videoId) {
        const track = createTrackFromVideoId(videoId);
        showToast(t("search.playingUrl", language));
        setQueue([track], 0);
        setCurrentTrack(track);
        setIsPlaying(true);
        return;
      }

      setSearching(true);
      try {
        const tracks = await searchYouTubeAll(q, f);
        setSearchResults(tracks);
      } catch {
        // silently fail
      } finally {
        setSearching(false);
      }
    },
    [
      searchQuery,
      searchFilter,
      language,
      showToast,
      setQueue,
      setCurrentTrack,
      setIsPlaying,
    ],
  );

  const handleSearchFilterChange = (filter: SearchFilter) => {
    setSearchFilter(filter);
    if (searchQuery.trim()) {
      handleSearch(searchQuery, filter);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  // Queue enhancement functions
  const handleClearQueue = () => {
    setQueue([], -1);
    setCurrentTrack(null);
    setIsPlaying(false);
    showToast(t("compact.clearQueueConfirm", language));
  };

  const handleMoveInQueue = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= queue.length) return;
    const newQueue = [...queue];
    [newQueue[index], newQueue[newIndex]] = [
      newQueue[newIndex],
      newQueue[index],
    ];
    // Adjust queueIndex if the currently playing track was moved
    let newQueueIndex = queueIndex;
    if (queueIndex === index) newQueueIndex = newIndex;
    else if (queueIndex === newIndex) newQueueIndex = index;
    setQueue(newQueue, newQueueIndex);
  };

  const handlePlayFromQueue = (index: number) => {
    const track = queue[index];
    if (!track) return;
    setQueue(queue, index);
    setCurrentTrack(track);
    setIsPlaying(true);
    if (provider === "youtube") {
      addToYouTubeHistory(track);
    }
  };

  // Search result: play now (set as queue and play)
  const handlePlaySearchResult = (track: RakuTrack, index: number) => {
    // Filter playable tracks from search results
    const playable = searchResults.filter(
      (t) =>
        t.itemType !== "album" &&
        t.itemType !== "playlist" &&
        t.itemType !== "artist",
    );
    const playableIndex = playable.findIndex((t) => t.id === track.id);
    if (playableIndex >= 0) {
      setQueue(playable, playableIndex);
      setCurrentTrack(track);
      setIsPlaying(true);
      if (provider === "youtube") {
        addToYouTubeHistory(track);
      }
    }
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
          <span
            className={`text-[8px] font-bold px-1 py-0.5 rounded-sm leading-none ${
              ytPremium
                ? "bg-amber-500/20 text-amber-400"
                : "bg-white/10 text-gray-400"
            }`}>
            {ytPremium
              ? t("player.premium", language)
              : t("player.free", language)}
          </span>
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
        {/* Like, Lyrics, Add to Playlist & Volume */}
        <div className="flex items-center gap-2 mt-3 relative">
          {currentTrack && (
            <>
              <button
                onClick={handleLike}
                disabled={likingInProgress}
                className={`p-1 rounded transition-colors ${
                  isLiked ? "text-red-400" : "text-gray-500 hover:text-red-400"
                } disabled:opacity-50`}
                title={isLiked ? "Unlike" : "Like"}>
                <FiHeart size={12} className={isLiked ? "fill-current" : ""} />
              </button>
              <button
                onClick={handleToggleLyrics}
                className={`p-1 rounded transition-colors ${
                  showLyrics
                    ? "text-melon-green"
                    : "text-gray-500 hover:text-melon-green"
                }`}
                title={t("compact.lyrics", language)}>
                <FiMusic size={12} />
              </button>
              {/* Lyrics position toggle */}
              {showLyrics && (
                <button
                  onClick={handleToggleLyricsPosition}
                  className="p-1 rounded transition-colors text-gray-500 hover:text-gray-300"
                  title={
                    lyricsPosition === "left" ? "Move to right" : "Move to left"
                  }>
                  {lyricsPosition === "left" ? (
                    <span className="text-[9px]">▶</span>
                  ) : (
                    <span className="text-[9px]">◀</span>
                  )}
                </button>
              )}
              <button
                onClick={handleOpenPlaylistMenu}
                className={`p-1 rounded transition-colors ${
                  showPlaylistMenu
                    ? "text-melon-green"
                    : "text-gray-500 hover:text-melon-green"
                }`}
                title="Add to playlist">
                <FiPlus size={12} />
              </button>
              {showPlaylistMenu && (
                <div
                  ref={playlistMenuRef}
                  className="absolute left-0 bottom-full mb-2 w-48 bg-[#2a2a2a] border border-gray-600 rounded-lg shadow-xl z-50 py-1 max-h-52 overflow-y-auto">
                  {showCreateInput ? (
                    <div className="flex items-center gap-1 px-2 py-1.5">
                      <input
                        autoFocus
                        value={newPlaylistName}
                        onChange={(e) => setNewPlaylistName(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleCreatePlaylist()
                        }
                        placeholder="Playlist name"
                        className="flex-1 bg-[#333] border border-gray-600 rounded px-1.5 py-0.5 text-[10px] text-gray-200 placeholder-gray-500 focus:outline-none focus:border-melon-green"
                      />
                      <button
                        onClick={handleCreatePlaylist}
                        className="text-[10px] text-melon-green hover:text-melon-darkgreen font-medium px-1">
                        OK
                      </button>
                      <button
                        onClick={() => setShowCreateInput(false)}
                        className="text-gray-400 hover:text-gray-200">
                        <FiX size={10} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowCreateInput(true)}
                      className="w-full px-3 py-1.5 text-left text-[10px] hover:bg-white/10 flex items-center gap-2 text-melon-green font-medium">
                      <FiPlus size={10} />
                      New playlist
                    </button>
                  )}
                  <div className="border-t border-gray-600 my-0.5" />
                  {playlists.length === 0 ? (
                    <div className="px-3 py-2 text-[10px] text-gray-500">
                      No playlists found
                    </div>
                  ) : (
                    playlists.map((pl) => (
                      <button
                        key={pl.playlistId}
                        onClick={() => handleAddToPlaylist(pl.playlistId)}
                        className="w-full px-3 py-1.5 text-left text-[10px] hover:bg-white/10 flex items-center gap-2 truncate text-gray-300">
                        {pl.thumbnail ? (
                          <img
                            src={pl.thumbnail}
                            alt=""
                            className="w-5 h-5 rounded object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded bg-gray-700 flex items-center justify-center shrink-0">
                            <FiMusic size={8} className="text-gray-500" />
                          </div>
                        )}
                        <span className="truncate">{pl.name}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </>
          )}
          <div className="flex items-center gap-1.5 ml-auto w-auto">
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
      </div>

      {/* Main content wrapper */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Main content (tabs + tab content) */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tabs: playlist / search */}
          <div className="flex items-center bg-[#222] border-t border-b border-gray-700 shrink-0">
            <button
              onClick={() => setActiveTab("playlist")}
              className={`flex-1 py-1.5 text-center text-[11px] font-medium transition-colors ${
                activeTab === "playlist"
                  ? "text-melon-green border-b-2 border-melon-green"
                  : "text-gray-500 hover:text-gray-300"
              }`}>
              {t("compact.currentPlaylist", language)} ({queue.length})
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
              /* Enhanced queue */
              <div className="flex flex-col h-full">
                {/* Queue header with clear button */}
                {queue.length > 0 && (
                  <div className="flex items-center justify-between px-2 py-1 bg-[#222] border-b border-gray-700 shrink-0">
                    <span className="text-[10px] text-gray-400">
                      {queue.length} {t("queue.tracks", language)}
                    </span>
                    <button
                      onClick={handleClearQueue}
                      className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-red-400 transition-colors"
                      title={t("compact.clearQueue", language)}>
                      <FiTrash2 size={10} />
                      {t("queue.clear", language)}
                    </button>
                  </div>
                )}

                {/* Queue list */}
                <div className="flex-1 overflow-y-auto">
                  {queue.length > 0 ? (
                    queue.map((track, index) => (
                      <div
                        key={`${track.id}-${index}`}
                        onDoubleClick={() => handlePlayFromQueue(index)}
                        className={`w-full flex items-center gap-1.5 px-2 py-1.5 text-left transition-colors cursor-pointer group ${
                          index === queueIndex
                            ? "bg-melon-green/20 text-melon-green"
                            : "text-gray-300 hover:bg-white/5"
                        }`}>
                        {/* Play indicator / index */}
                        <span
                          className={`w-5 text-right text-[11px] shrink-0 ${
                            index === queueIndex
                              ? "text-melon-green font-bold"
                              : "text-gray-500"
                          }`}>
                          {index === queueIndex && isPlaying ? "▶" : index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="block text-[12px] truncate font-medium">
                            {track.name}
                          </span>
                          {track.artists?.length > 0 && (
                            <span className="block text-[10px] truncate text-gray-500">
                              {track.artists.map((a) => a.name).join(", ")}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-500 shrink-0">
                          {formatTime(track.duration_ms)}
                        </span>
                        {/* Move up/down buttons */}
                        <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-all shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveInQueue(index, "up");
                            }}
                            disabled={index === 0}
                            className="p-0 text-gray-600 hover:text-melon-green disabled:opacity-30"
                            title={t("compact.moveUp", language)}>
                            <FiChevronUp size={10} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveInQueue(index, "down");
                            }}
                            disabled={index === queue.length - 1}
                            className="p-0 text-gray-600 hover:text-melon-green disabled:opacity-30"
                            title={t("compact.moveDown", language)}>
                            <FiChevronDown size={10} />
                          </button>
                        </div>
                        <button
                          onClick={(e) => handleRemoveTrack(e, index)}
                          className="p-0.5 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                          title="Remove">
                          <FiX size={12} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-1">
                      <FiMusic size={20} className="text-gray-700" />
                      <p className="text-gray-600 text-xs">
                        {t("queue.empty", language)}
                      </p>
                      <p className="text-gray-700 text-[10px]">
                        {t("queue.emptyHint", language)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Search tab with filters */
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
                      placeholder={
                        t("search.placeholder", language) + " / YouTube URL"
                      }
                      className="w-full bg-[#333] border border-gray-600 rounded pl-7 pr-2 py-1.5 text-[11px] text-gray-200 placeholder-gray-500 focus:outline-none focus:border-melon-green transition-colors"
                    />
                  </div>
                  <button
                    onClick={() => handleSearch()}
                    className="px-2.5 py-1.5 bg-melon-green hover:bg-melon-darkgreen text-white text-[10px] rounded transition-colors font-medium shrink-0">
                    {t("compact.search", language)}
                  </button>
                </div>

                {/* Filter pills */}
                <div className="flex gap-1 px-2 py-1.5 bg-[#222] overflow-x-auto shrink-0 border-b border-gray-700">
                  {COMPACT_FILTERS.map(({ key, labelKey }) => (
                    <button
                      key={key}
                      onClick={() => handleSearchFilterChange(key)}
                      className={`px-2 py-0.5 rounded-full text-[9px] font-medium whitespace-nowrap transition-colors ${
                        searchFilter === key
                          ? "bg-melon-green text-white"
                          : "bg-[#333] text-gray-400 hover:bg-[#444]"
                      }`}>
                      {t(labelKey, language)}
                    </button>
                  ))}
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
                      const isCollection =
                        track.itemType === "album" ||
                        track.itemType === "playlist";
                      const isArtist = track.itemType === "artist";
                      const isVideo = track.itemType === "video";
                      const isNonPlayable = isCollection || isArtist;
                      return (
                        <div
                          key={`${track.id}-${index}`}
                          onDoubleClick={() =>
                            !isNonPlayable &&
                            handlePlaySearchResult(track, index)
                          }
                          className="flex items-center gap-1.5 px-2 py-1.5 text-gray-300 hover:bg-white/5 transition-colors group cursor-pointer">
                          <span className="w-5 text-right text-[11px] text-gray-500 shrink-0">
                            {index + 1}
                          </span>
                          {/* Thumbnail */}
                          <div className="w-7 h-7 rounded bg-gray-800 overflow-hidden shrink-0">
                            {track.album?.images?.[0]?.url ? (
                              <img
                                src={track.album.images[0].url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <FiMusic size={8} className="text-gray-600" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="block text-[12px] truncate font-medium">
                                {track.name}
                              </span>
                              {isCollection && (
                                <span
                                  className={`shrink-0 text-[8px] px-1 py-0.5 rounded-full font-medium ${
                                    track.itemType === "album"
                                      ? "bg-purple-500/20 text-purple-400"
                                      : "bg-blue-500/20 text-blue-400"
                                  }`}>
                                  {track.itemType === "album"
                                    ? "Album"
                                    : "Playlist"}
                                </span>
                              )}
                              {isArtist && (
                                <span className="shrink-0 text-[8px] px-1 py-0.5 rounded-full font-medium bg-green-500/20 text-green-400">
                                  Artist
                                </span>
                              )}
                              {isVideo && (
                                <span className="shrink-0 text-[8px] px-1 py-0.5 rounded-full font-medium bg-red-500/20 text-red-400">
                                  Video
                                </span>
                              )}
                            </div>
                            {track.artists?.length > 0 && (
                              <span className="block text-[10px] truncate text-gray-500">
                                {track.artists.map((a) => a.name).join(", ")}
                              </span>
                            )}
                          </div>
                          {!isNonPlayable && (
                            <>
                              <span className="text-[10px] text-gray-500 shrink-0">
                                {formatTime(track.duration_ms)}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddToQueue(track);
                                }}
                                className={`p-0.5 shrink-0 transition-all ${
                                  isInQueue
                                    ? "text-melon-green"
                                    : "text-gray-600 hover:text-melon-green opacity-0 group-hover:opacity-100"
                                }`}
                                title="Add to queue">
                                <FiPlus size={13} />
                              </button>
                            </>
                          )}
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
                    <div className="flex flex-col items-center justify-center py-8 gap-1">
                      <FiSearch size={24} className="text-gray-700" />
                      <p className="text-gray-600 text-[10px]">
                        {t("search.prompt", language)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom status */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#111] border-t border-gray-700 shrink-0">
        <span className="text-[10px] text-gray-500">
          {queue.length > 0
            ? `${queueIndex + 1}/${queue.length} ${t("queue.tracks", language)} — ${formatTime(progress)}`
            : "---"}
        </span>
        <span className="text-[10px] text-gray-500">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
