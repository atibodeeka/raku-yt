// YouTube Music API wrapper (via Electron IPC → ytmusic-api)

import { RakuTrack } from "./store";

// Type for the IPC bridge exposed via preload.js
declare global {
  interface Window {
    ytmusicAPI?: {
      searchSongs: (query: string) => Promise<YTMusicSong[]>;
      getHomeSections: () => Promise<YTMusicHomeSection[]>;
      getArtist: (artistId: string) => Promise<YTMusicArtist | null>;
      getArtistSongs: (artistId: string) => Promise<YTMusicSong[]>;
      getPlaylistVideos: (playlistId: string) => Promise<YTMusicVideo[]>;
    };
  }
}

// ytmusic-api types (simplified for our needs)
interface YTMusicThumbnail {
  url: string;
  width: number;
  height: number;
}

interface YTMusicSong {
  type: "SONG";
  videoId: string;
  name: string;
  artist: { artistId: string | null; name: string };
  album: { albumId: string; name: string } | null;
  duration: number | null;
  thumbnails: YTMusicThumbnail[];
}

interface YTMusicVideo {
  type: "VIDEO";
  videoId: string;
  name: string;
  artist: { artistId: string | null; name: string };
  duration: number | null;
  thumbnails: YTMusicThumbnail[];
}

interface YTMusicHomeSection {
  title: string;
  contents: Array<YTMusicSong | YTMusicHomeAlbum | YTMusicHomePlaylist>;
}

interface YTMusicHomeAlbum {
  type: "ALBUM";
  albumId: string;
  name: string;
  artist: { artistId: string | null; name: string };
  thumbnails: YTMusicThumbnail[];
  playlistId: string;
  year: number | null;
}

interface YTMusicHomePlaylist {
  type: "PLAYLIST";
  name: string;
  artist: { artistId: string | null; name: string };
  thumbnails: YTMusicThumbnail[];
  playlistId: string;
}

interface YTMusicArtist {
  artistId: string;
  name: string;
  thumbnails: YTMusicThumbnail[];
  topSongs: YTMusicSong[];
}

// Convert ytmusic-api song to unified RakuTrack
function songToTrack(song: YTMusicSong): RakuTrack {
  return {
    id: song.videoId,
    name: song.name || "不明な曲",
    artists: [{ id: song.artist.artistId || "", name: song.artist.name }],
    album: {
      id: song.album?.albumId || "",
      name: song.album?.name || "",
      images:
        song.thumbnails.length > 0
          ? [
              {
                url: song.thumbnails[song.thumbnails.length - 1].url,
                width: 480,
                height: 480,
              },
            ]
          : [],
    },
    duration_ms: (song.duration || 0) * 1000,
    uri: song.videoId,
    preview_url: null,
    provider: "youtube",
  };
}

// Convert ytmusic-api video to unified RakuTrack
function videoToTrack(video: YTMusicVideo): RakuTrack {
  return {
    id: video.videoId,
    name: video.name || "不明な曲",
    artists: [{ id: video.artist.artistId || "", name: video.artist.name }],
    album: {
      id: "",
      name: "",
      images:
        video.thumbnails.length > 0
          ? [
              {
                url: video.thumbnails[video.thumbnails.length - 1].url,
                width: 480,
                height: 480,
              },
            ]
          : [],
    },
    duration_ms: (video.duration || 0) * 1000,
    uri: video.videoId,
    preview_url: null,
    provider: "youtube",
  };
}

// 楽曲検索
export async function searchYouTubeTracks(
  query: string,
  _maxResults = 20,
): Promise<RakuTrack[]> {
  if (!window.ytmusicAPI) return [];
  const songs = await window.ytmusicAPI.searchSongs(query);
  return songs.map(songToTrack);
}

// 人気の音楽 (YouTube Data API v3 — Top 50 Music in Japan)
export async function getYouTubeTrendingMusic(
  maxResults = 50,
): Promise<RakuTrack[]> {
  const data = await fetchYouTube("/videos", {
    part: "snippet,contentDetails",
    chart: "mostPopular",
    regionCode: "JP",
    videoCategoryId: "10", // Music category
    maxResults: maxResults.toString(),
  });

  if (!data?.items) return [];
  return data.items.map(
    (item: {
      id: string;
      snippet: {
        title: string;
        channelId: string;
        channelTitle: string;
        thumbnails: { high?: { url: string }; default?: { url: string } };
      };
      contentDetails?: { duration: string };
    }) => ({
      id: item.id,
      name: item.snippet.title,
      artists: [
        { id: item.snippet.channelId, name: item.snippet.channelTitle },
      ],
      album: {
        id: "",
        name: "",
        images: [
          {
            url:
              item.snippet.thumbnails?.high?.url ||
              item.snippet.thumbnails?.default?.url ||
              "",
            width: 480,
            height: 360,
          },
        ],
      },
      duration_ms: item.contentDetails?.duration
        ? parseDuration(item.contentDetails.duration)
        : 0,
      uri: item.id,
      preview_url: null,
      provider: "youtube" as const,
    }),
  );
}

// YouTube Data API v3 — used for authenticated operations only
const YT_API_BASE = "https://www.googleapis.com/youtube/v3";
const YT_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || "";

async function fetchYouTube(
  endpoint: string,
  params: Record<string, string>,
  accessToken?: string,
  options?: { method?: string },
) {
  const searchParams = new URLSearchParams({
    ...params,
    key: YT_API_KEY,
  });

  const headers: Record<string, string> = {};
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${YT_API_BASE}${endpoint}?${searchParams}`, {
    method: options?.method || "GET",
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error("UNAUTHORIZED");
    throw new Error(`YouTube API Error: ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

// ユーザーのお気に入り（高評価動画） — requires OAuth
export async function getYouTubeLikedVideos(
  accessToken: string,
  maxResults = 50,
): Promise<RakuTrack[]> {
  const data = await fetchYouTube(
    "/videos",
    {
      part: "snippet,contentDetails,status",
      myRating: "like",
      maxResults: maxResults.toString(),
    },
    accessToken,
  );

  if (!data?.items) return [];
  return data.items
    .filter(
      (item: { status?: { embeddable?: boolean } }) =>
        item.status?.embeddable !== false,
    )
    .map(
      (item: {
        id: string;
        snippet: {
          title: string;
          channelId: string;
          channelTitle: string;
          thumbnails: { high?: { url: string }; default?: { url: string } };
        };
        contentDetails?: { duration: string };
      }) => ({
        id: item.id,
        name: item.snippet.title,
        artists: [
          { id: item.snippet.channelId, name: item.snippet.channelTitle },
        ],
        album: {
          id: "",
          name: "",
          images: [
            {
              url:
                item.snippet.thumbnails?.high?.url ||
                item.snippet.thumbnails?.default?.url ||
                "",
              width: 480,
              height: 360,
            },
          ],
        },
        duration_ms: item.contentDetails?.duration
          ? parseDuration(item.contentDetails.duration)
          : 0,
        uri: item.id,
        preview_url: null,
        provider: "youtube" as const,
      }),
    );
}

// ユーザー情報取得 (Google OAuth)
export async function getYouTubeUserInfo(accessToken: string) {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) throw new Error("ユーザー情報の取得に失敗しました");

  const data = await response.json();
  return {
    id: data.id,
    display_name: data.name || "YouTubeユーザー",
    email: data.email || "",
    images: data.picture ? [{ url: data.picture }] : [],
    product: "youtube",
  };
}

// Parse ISO 8601 duration (PT4M13S) to milliseconds
function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  return (hours * 3600 + minutes * 60 + seconds) * 1000;
}

// アーティスト情報取得 (via ytmusic-api)
export async function getYouTubeChannelInfo(channelId: string) {
  if (!window.ytmusicAPI) return null;
  try {
    const artist = await window.ytmusicAPI.getArtist(channelId);
    if (!artist) return null;
    return {
      id: artist.artistId,
      name: artist.name,
      description: "",
      thumbnail: artist.thumbnails?.[artist.thumbnails.length - 1]?.url || "",
      subscriberCount: "0",
      videoCount: "0",
      uploadsPlaylistId: "", // not used with ytmusic-api
    };
  } catch {
    return null;
  }
}

// アーティストのトップ曲取得 (via ytmusic-api)
export async function getYouTubePlaylistItems(
  playlistId: string,
  _maxResults = 20,
  _accessToken?: string,
): Promise<RakuTrack[]> {
  if (!window.ytmusicAPI) return [];
  try {
    // If it's an artist ID (starts with UC), get artist songs
    if (playlistId.startsWith("UC")) {
      const songs = await window.ytmusicAPI.getArtistSongs(playlistId);
      return songs.map(songToTrack);
    }
    // Otherwise treat as playlist
    const videos = await window.ytmusicAPI.getPlaylistVideos(playlistId);
    return videos.map(videoToTrack);
  } catch {
    return [];
  }
}

// ユーザーのプレイリスト一覧 — requires OAuth
export async function getYouTubeUserPlaylists(
  accessToken: string,
  maxResults = 10,
) {
  const data = await fetchYouTube(
    "/playlists",
    {
      part: "snippet,contentDetails",
      mine: "true",
      maxResults: maxResults.toString(),
    },
    accessToken,
  );

  if (!data?.items) return [];
  return data.items.map(
    (item: {
      id: string;
      snippet: {
        title: string;
        description: string;
        thumbnails: { high?: { url: string }; default?: { url: string } };
      };
      contentDetails?: { itemCount: number };
    }) => ({
      id: item.id,
      name: item.snippet.title,
      description: item.snippet.description || "",
      thumbnail:
        item.snippet.thumbnails?.high?.url ||
        item.snippet.thumbnails?.default?.url ||
        "",
      itemCount: item.contentDetails?.itemCount || 0,
    }),
  );
}

// 動画の評価（いいね / いいね解除）— requires OAuth
export async function rateYouTubeVideo(
  accessToken: string,
  videoId: string,
  rating: "like" | "none",
): Promise<void> {
  await fetchYouTube(
    "/videos/rate",
    {
      id: videoId,
      rating,
    },
    accessToken,
    { method: "POST" },
  );
}
