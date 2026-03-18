"use client";

import { useState, useCallback, useEffect } from "react";
import { useStore, RakuTrack } from "@/lib/store";
import {
  searchYouTubeAll,
  SearchFilter,
  parseYouTubeUrl,
  createTrackFromVideoId,
} from "@/lib/youtube-api";
import TrackList from "@/components/TrackList";
import Spinner from "@/components/ui/Spinner";
import PageHeader from "@/components/ui/PageHeader";
import { t, TranslationKey } from "@/lib/i18n";
import { FiSearch } from "react-icons/fi";

const FILTERS: { key: SearchFilter; labelKey: TranslationKey }[] = [
  { key: "all", labelKey: "search.filterAll" },
  { key: "songs", labelKey: "search.filterSongs" },
  { key: "videos", labelKey: "search.filterVideos" },
  { key: "albums", labelKey: "search.filterAlbums" },
  { key: "artists", labelKey: "search.filterArtists" },
  { key: "playlists", labelKey: "search.filterPlaylists" },
];

export default function SearchPage() {
  const searchQuery = useStore((s) => s.searchQuery);
  const setSearchQuery = useStore((s) => s.setSearchQuery);
  const searchFilter = useStore((s) => s.searchFilter);
  const setSearchFilter = useStore((s) => s.setSearchFilter);
  const [results, setResults] = useState<RakuTrack[]>([]);
  const language = useStore((s) => s.language);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [urlError, setUrlError] = useState(false);

  const setCurrentTrack = useStore((s) => s.setCurrentTrack);
  const setQueue = useStore((s) => s.setQueue);
  const setIsPlaying = useStore((s) => s.setIsPlaying);
  const showToast = useStore((s) => s.showToast);

  const handlePlayFromUrl = useCallback(
    (videoId: string) => {
      setUrlError(false);
      const track = createTrackFromVideoId(videoId);
      showToast(t("search.playingUrl", language));
      setQueue([track], 0);
      setCurrentTrack(track);
      setIsPlaying(true);
    },
    [language, setCurrentTrack, setQueue, setIsPlaying, showToast],
  );

  const handleSearch = useCallback(
    async (query?: string, filter?: SearchFilter) => {
      const q = query ?? searchQuery;
      const f = filter ?? searchFilter;
      if (!q.trim()) return;

      // Check if the query is a YouTube URL
      const videoId = parseYouTubeUrl(q.trim());
      if (videoId) {
        handlePlayFromUrl(videoId);
        return;
      }

      setUrlError(false);
      setLoading(true);
      setSearched(true);
      try {
        const tracks = await searchYouTubeAll(q.trim(), f);
        setResults(tracks);
      } catch (err) {
        console.error("検索エラー:", err);
      } finally {
        setLoading(false);
      }
    },
    [searchQuery, searchFilter, handlePlayFromUrl],
  );

  const handleFilterChange = (filter: SearchFilter) => {
    setSearchFilter(filter);
    if (searchQuery.trim()) {
      handleSearch(searchQuery, filter);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="p-6">
      <PageHeader icon={FiSearch} title={t("search.title", language)} />

      {/* Search bar */}
      <div className="mb-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <FiSearch
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("search.placeholder", language) + " / YouTube URL"}
              className="w-full bg-white border border-gray-200 rounded pl-10 pr-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-melon-green transition-colors"
            />
          </div>
          <button
            onClick={() => handleSearch()}
            className="btn-retro text-sm text-melon-green hover:text-white">
            {t("search.button", language)}
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
        {FILTERS.map(({ key, labelKey }) => (
          <button
            key={key}
            onClick={() => handleFilterChange(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              searchFilter === key
                ? "bg-melon-green text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            {t(labelKey, language)}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : results.length > 0 ? (
        <div className="border border-gray-200 rounded overflow-hidden">
          <TrackList tracks={results} showRank />
        </div>
      ) : searched ? (
        <div className="text-center py-20">
          <p className="text-gray-500 text-sm">
            {t("search.noResults", language)}
          </p>
          <p className="text-gray-400 text-xs mt-1">
            {t("search.tryOther", language)}
          </p>
          <p className="text-gray-400 text-xs mt-2">
            {t("search.urlHint", language)}
          </p>
        </div>
      ) : urlError ? (
        <div className="text-center py-20">
          <p className="text-red-500 text-sm">
            {t("search.urlFailed", language)}
          </p>
          <p className="text-gray-400 text-xs mt-2">
            {t("search.urlHint", language)}
          </p>
        </div>
      ) : (
        <div className="text-center py-20">
          <FiSearch size={40} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-sm">
            {t("search.prompt", language)}
          </p>
          <p className="text-gray-400 text-xs mt-2">
            {t("search.urlHint", language)}
          </p>
        </div>
      )}
    </div>
  );
}
