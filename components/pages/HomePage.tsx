"use client";

import { useEffect, useState, useCallback } from "react";
import { useStore, RakuTrack } from "@/lib/store";
import {
  getNewReleases,
  getFeaturedPlaylists,
  getRecentlyPlayed,
} from "@/lib/spotify-api";
import {
  getYouTubeTrendingMusic,
  getYouTubeUserPlaylists,
  getYouTubePlaylistItems,
} from "@/lib/youtube-api";
import TrackList from "@/components/TrackList";
import Spinner from "@/components/ui/Spinner";
import PageHeader from "@/components/ui/PageHeader";
import { t } from "@/lib/i18n";
import { FiTrendingUp, FiDisc, FiClock, FiList } from "react-icons/fi";

export default function HomePage() {
  const language = useStore((s) => s.language);
  const accessToken = useStore((s) => s.accessToken);
  const provider = useStore((s) => s.provider);
  const [recentTracks, setRecentTracks] = useState<RakuTrack[]>([]);
  const [newAlbums, setNewAlbums] = useState<
    Array<{
      id: string;
      name: string;
      artists: { name: string }[];
      images: { url: string }[];
    }>
  >([]);
  const [playlists, setPlaylists] = useState<
    Array<{
      id: string;
      name: string;
      description: string;
      images: { url: string }[];
    }>
  >([]);
  const [trendingTracks, setTrendingTracks] = useState<RakuTrack[]>([]);
  const [ytPlaylists, setYtPlaylists] = useState<
    Array<{
      id: string;
      name: string;
      description: string;
      thumbnail: string;
      itemCount: number;
    }>
  >([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<RakuTrack[]>([]);
  const [loadingPlaylist, setLoadingPlaylist] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      if (provider === "youtube") {
        // Fetch independently so one failure doesn't block the other
        const [trendingResult, playlistsResult] = await Promise.allSettled([
          getYouTubeTrendingMusic(50),
          getYouTubeUserPlaylists(accessToken, 10),
        ]);

        if (trendingResult.status === "fulfilled") {
          setTrendingTracks(trendingResult.value);
        } else {
          console.error("トレンド取得エラー:", trendingResult.reason);
        }

        if (playlistsResult.status === "fulfilled") {
          setYtPlaylists(playlistsResult.value);
        } else {
          console.error("プレイリスト取得エラー:", playlistsResult.reason);
        }

        if (
          trendingResult.status === "rejected" &&
          playlistsResult.status === "rejected"
        ) {
          setError(t("home.fetchError", useStore.getState().language));
        }
      } else {
        const [recentResult, releasesResult, featuredResult] =
          await Promise.allSettled([
            getRecentlyPlayed(accessToken, 10),
            getNewReleases(accessToken, 10),
            getFeaturedPlaylists(accessToken, 10),
          ]);

        if (recentResult.status === "fulfilled" && recentResult.value?.items) {
          const tracks = recentResult.value.items.map(
            (item: { track: RakuTrack }) => item.track,
          );
          const seen = new Set<string>();
          const unique = tracks.filter((t: RakuTrack) => {
            if (seen.has(t.id)) return false;
            seen.add(t.id);
            return true;
          });
          setRecentTracks(unique);
        } else if (recentResult.status === "rejected") {
          console.error("最近再生取得エラー:", recentResult.reason);
        }

        if (
          releasesResult.status === "fulfilled" &&
          releasesResult.value?.albums?.items
        ) {
          setNewAlbums(releasesResult.value.albums.items);
        } else if (releasesResult.status === "rejected") {
          console.error("新着リリース取得エラー:", releasesResult.reason);
        }

        if (
          featuredResult.status === "fulfilled" &&
          featuredResult.value?.playlists?.items
        ) {
          setPlaylists(featuredResult.value.playlists.items);
        } else if (featuredResult.status === "rejected") {
          console.error("プレイリスト取得エラー:", featuredResult.reason);
        }

        if (
          recentResult.status === "rejected" &&
          releasesResult.status === "rejected" &&
          featuredResult.status === "rejected"
        ) {
          setError(t("home.spotifyFetchError", useStore.getState().language));
        }
      }
    } catch (err) {
      console.error("ホームページデータ取得エラー:", err);
      setError(t("home.unexpectedError", useStore.getState().language));
    } finally {
      setLoading(false);
    }
  }, [accessToken, provider]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        icon={FiTrendingUp}
        title={t("home.title", language)}
        subtitle={t("home.subtitle", language)}
      />

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          {error}
          <button
            onClick={fetchData}
            className="ml-3 text-xs text-melon-green hover:underline">
            {t("home.retry", language)}
          </button>
        </div>
      )}

      {/* YouTube trending or Spotify sections */}
      {provider === "youtube" ? (
        <>
          {/* YouTube Playlists */}
          {ytPlaylists.length > 0 && (
            <section className="mb-8">
              <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <FiList size={14} className="text-melon-green" />
                {t("home.yourPlaylists", language)}
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {ytPlaylists.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={async () => {
                      if (selectedPlaylist === pl.id) {
                        setSelectedPlaylist(null);
                        setPlaylistTracks([]);
                        return;
                      }
                      setSelectedPlaylist(pl.id);
                      setLoadingPlaylist(true);
                      try {
                        const tracks = await getYouTubePlaylistItems(
                          pl.id,
                          30,
                          accessToken || undefined,
                        );
                        setPlaylistTracks(tracks);
                      } catch (err) {
                        console.error("プレイリストアイテム取得エラー:", err);
                      } finally {
                        setLoadingPlaylist(false);
                      }
                    }}
                    className={`shrink-0 w-32 group text-left ${
                      selectedPlaylist === pl.id
                        ? "ring-2 ring-melon-green rounded-lg"
                        : ""
                    }`}>
                    <div className="w-32 h-32 rounded bg-gray-100 overflow-hidden mb-2">
                      {pl.thumbnail && (
                        <img
                          src={pl.thumbnail}
                          alt={pl.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      )}
                    </div>
                    <p className="text-xs text-gray-800 truncate">{pl.name}</p>
                    <p className="text-[10px] text-gray-500 truncate">
                      {pl.itemCount} {t("home.songs", language)}
                    </p>
                  </button>
                ))}
              </div>
              {/* Selected playlist tracks */}
              {selectedPlaylist && (
                <div className="mt-4">
                  {loadingPlaylist ? (
                    <div className="flex items-center justify-center py-10">
                      <Spinner size="sm" />
                    </div>
                  ) : playlistTracks.length > 0 ? (
                    <div className="border border-gray-200 rounded overflow-hidden">
                      <TrackList tracks={playlistTracks} showRank />
                    </div>
                  ) : (
                    <p className="text-gray-500 text-xs text-center py-6">
                      {t("home.noPlaylistTracks", language)}
                    </p>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Trending */}
          <section>
            <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <FiTrendingUp size={14} className="text-melon-green" />
              {t("home.trending", language)}
            </h2>
            <div className="border border-gray-200 rounded overflow-hidden">
              <TrackList tracks={trendingTracks} showRank />
            </div>
          </section>
        </>
      ) : (
        <>
          {/* New Releases - horizontal scroll */}
          <section className="mb-8">
            <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <FiDisc size={14} className="text-melon-green" />
              {t("home.newReleases", language)}
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {newAlbums.map((album) => (
                <div
                  key={album.id}
                  className="shrink-0 w-32 group cursor-pointer">
                  <div className="w-32 h-32 rounded bg-gray-100 overflow-hidden mb-2">
                    {album.images?.[0]?.url && (
                      <img
                        src={album.images[0].url}
                        alt={album.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    )}
                  </div>
                  <p className="text-xs text-gray-800 truncate">{album.name}</p>
                  <p className="text-[10px] text-gray-500 truncate">
                    {album.artists?.map((a) => a.name).join(", ")}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Featured Playlists */}
          <section className="mb-8">
            <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span className="text-melon-green">♪</span>
              {t("home.featuredPlaylists", language)}
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {playlists.map((pl) => (
                <div key={pl.id} className="shrink-0 w-32 group cursor-pointer">
                  <div className="w-32 h-32 rounded bg-gray-100 overflow-hidden mb-2">
                    {pl.images?.[0]?.url && (
                      <img
                        src={pl.images[0].url}
                        alt={pl.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    )}
                  </div>
                  <p className="text-xs text-gray-800 truncate">{pl.name}</p>
                  <p className="text-[10px] text-gray-500 truncate">
                    {pl.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Recently Played */}
          <section>
            <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <FiClock size={14} className="text-melon-green" />
              {t("home.recentlyPlayed", language)}
            </h2>
            <div className="border border-gray-200 rounded overflow-hidden">
              <TrackList tracks={recentTracks} showRank />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
