"use client";

import { useState, useCallback } from "react";
import { useStore, RakuTrack } from "@/lib/store";
import { searchYouTubeTracks } from "@/lib/youtube-api";
import TrackList from "@/components/TrackList";
import Spinner from "@/components/ui/Spinner";
import PageHeader from "@/components/ui/PageHeader";
import { t } from "@/lib/i18n";
import { FiSearch } from "react-icons/fi";

export default function SearchPage() {
  const searchQuery = useStore((s) => s.searchQuery);
  const setSearchQuery = useStore((s) => s.setSearchQuery);
  const [results, setResults] = useState<RakuTrack[]>([]);
  const language = useStore((s) => s.language);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(
    async (query?: string) => {
      const q = query ?? searchQuery;
      if (!q.trim()) return;

      setLoading(true);
      setSearched(true);
      try {
        const tracks = await searchYouTubeTracks(q.trim());
        setResults(tracks);
      } catch (err) {
        console.error("検索エラー:", err);
      } finally {
        setLoading(false);
      }
    },
    [searchQuery],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="p-6">
      <PageHeader icon={FiSearch} title={t("search.title", language)} />

      {/* Search bar */}
      <div className="mb-6">
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
              placeholder={t("search.placeholder", language)}
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
        </div>
      ) : (
        <div className="text-center py-20">
          <FiSearch size={40} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-sm">
            {t("search.prompt", language)}
          </p>
        </div>
      )}
    </div>
  );
}
