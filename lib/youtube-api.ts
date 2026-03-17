// YouTube Music API wrapper (via Electron IPC → ytmusic-api)

import { RakuTrack } from "./store";

// Type for the IPC bridge exposed via preload.js
declare global {
  interface Window {
    ytmusicAPI?: {
      searchSongs: (query: string) => Promise<YTMusicSong[]>;
      searchVideos: (query: string) => Promise<YTMusicVideo[]>;
      search: (query: string) => Promise<YTMusicSearchResult[]>;
      searchArtists: (query: string) => Promise<YTMusicArtistDetailed[]>;
      searchAlbums: (query: string) => Promise<YTMusicAlbumDetailed[]>;
      searchPlaylists: (query: string) => Promise<YTMusicPlaylistDetailed[]>;
      getHomeSections: () => Promise<YTMusicHomeSection[]>;
      getArtist: (artistId: string) => Promise<YTMusicArtist | null>;
      getArtistSongs: (artistId: string) => Promise<YTMusicSong[]>;
      getPlaylistVideos: (playlistId: string) => Promise<YTMusicVideo[]>;
      getLikedSongs: () => Promise<InnertubeTrack[]>;
      getHistory: () => Promise<InnertubeTrack[]>;
      getLibraryPlaylists: () => Promise<LibraryPlaylistItem[]>;
      getSubscriptions: () => Promise<SubscriptionItem[]>;
      reportPlayback: (videoId: string) => Promise<{ success: boolean }>;
      rateSong: (
        videoId: string,
        rating: "LIKE" | "DISLIKE" | "INDIFFERENT",
      ) => Promise<{ success: boolean }>;
      createPlaylist: (
        title: string,
        videoIds?: string[],
      ) => Promise<{ success: boolean; playlistId?: string }>;
      addToPlaylist: (
        playlistId: string,
        videoIds: string[],
      ) => Promise<{ success: boolean }>;
      removeFromPlaylist: (
        playlistId: string,
        videoIds: string[],
        setVideoIds?: string[],
      ) => Promise<{ success: boolean }>;
      deletePlaylist: (playlistId: string) => Promise<{ success: boolean }>;
    };
  }
}

// Track object returned by our innertube browse handlers
interface InnertubeTrack {
  videoId: string;
  title: string;
  artistName: string;
  artistId: string;
  albumName: string;
  albumId: string;
  thumbnail: string;
  durationMs: number;
}

// Library playlist from innertube
export interface LibraryPlaylistItem {
  playlistId: string;
  name: string;
  subtitle: string;
  thumbnail: string;
}

// Subscribed artist from innertube
export interface SubscriptionItem {
  channelId: string;
  name: string;
  subtitle: string;
  thumbnail: string;
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

// Search result types for general search
interface YTMusicArtistDetailed {
  type: "ARTIST";
  artistId: string;
  name: string;
  thumbnails: YTMusicThumbnail[];
}

interface YTMusicAlbumDetailed {
  type: "ALBUM";
  albumId: string;
  playlistId: string;
  name: string;
  artist: { artistId: string | null; name: string };
  year: number | null;
  thumbnails: YTMusicThumbnail[];
}

interface YTMusicPlaylistDetailed {
  type: "PLAYLIST";
  playlistId: string;
  name: string;
  artist: { artistId: string | null; name: string };
  thumbnails: YTMusicThumbnail[];
}

type YTMusicSearchResult =
  | YTMusicSong
  | (YTMusicVideo & { type: "VIDEO" })
  | YTMusicArtistDetailed
  | YTMusicAlbumDetailed
  | YTMusicPlaylistDetailed;

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

// Convert home section content item to RakuTrack (songs, albums, playlists)
function homeItemToTrack(
  item: YTMusicSong | YTMusicHomeAlbum | YTMusicHomePlaylist,
): RakuTrack | null {
  if (item.type === "SONG") {
    const track = songToTrack(item as YTMusicSong);
    track.itemType = "song";
    return track;
  }
  // For albums and playlists, create a navigable entry
  if (item.type === "ALBUM") {
    const album = item as YTMusicHomeAlbum;
    return {
      id: album.playlistId || album.albumId,
      name: album.name,
      artists: [{ id: album.artist.artistId || "", name: album.artist.name }],
      album: {
        id: album.albumId,
        name: album.name,
        images:
          album.thumbnails.length > 0
            ? [
                {
                  url: album.thumbnails[album.thumbnails.length - 1].url,
                  width: 480,
                  height: 480,
                },
              ]
            : [],
      },
      duration_ms: 0,
      uri: album.playlistId || album.albumId,
      preview_url: null,
      provider: "youtube",
      itemType: "album",
    };
  }
  if (item.type === "PLAYLIST") {
    const pl = item as YTMusicHomePlaylist;
    return {
      id: pl.playlistId,
      name: pl.name,
      artists: [{ id: pl.artist.artistId || "", name: pl.artist.name }],
      album: {
        id: "",
        name: pl.name,
        images:
          pl.thumbnails.length > 0
            ? [
                {
                  url: pl.thumbnails[pl.thumbnails.length - 1].url,
                  width: 480,
                  height: 480,
                },
              ]
            : [],
      },
      duration_ms: 0,
      uri: pl.playlistId,
      preview_url: null,
      provider: "youtube",
      itemType: "playlist",
    };
  }
  return null;
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

// General search (all content types)
export type SearchFilter =
  | "all"
  | "songs"
  | "videos"
  | "albums"
  | "artists"
  | "playlists";

export async function searchYouTubeAll(
  query: string,
  filter: SearchFilter = "all",
): Promise<RakuTrack[]> {
  if (!window.ytmusicAPI) return [];

  if (filter === "songs") {
    const songs = await window.ytmusicAPI.searchSongs(query);
    return songs.map((s) => {
      const t = songToTrack(s);
      t.itemType = "song";
      return t;
    });
  }
  if (filter === "videos") {
    const videos = await window.ytmusicAPI.searchVideos(query);
    return videos.map((v) => {
      const t = videoToTrack(v);
      t.itemType = "video";
      return t;
    });
  }
  if (filter === "artists") {
    const artists = await window.ytmusicAPI.searchArtists(query);
    return artists.map(artistSearchToTrack);
  }
  if (filter === "albums") {
    const albums = await window.ytmusicAPI.searchAlbums(query);
    return albums.map(albumSearchToTrack);
  }
  if (filter === "playlists") {
    const playlists = await window.ytmusicAPI.searchPlaylists(query);
    return playlists.map(playlistSearchToTrack);
  }

  // "all" — combine songs + videos for comprehensive results
  // (ytmusic.search() returns 0 results for this region, so merge category searches)
  const [songs, videos] = await Promise.all([
    window.ytmusicAPI.searchSongs(query),
    window.ytmusicAPI.searchVideos(query),
  ]);
  const songTracks = songs.map((s) => {
    const t = songToTrack(s);
    t.itemType = "song";
    return t;
  });
  const videoTracks = videos.map((v) => {
    const t = videoToTrack(v);
    t.itemType = "video";
    return t;
  });
  // Merge and deduplicate by videoId, songs first
  const seen = new Set<string>();
  const merged: RakuTrack[] = [];
  for (const t of [...songTracks, ...videoTracks]) {
    if (!seen.has(t.id)) {
      seen.add(t.id);
      merged.push(t);
    }
  }
  return merged;
}

function searchResultToTrack(item: YTMusicSearchResult): RakuTrack | null {
  if (item.type === "SONG") {
    const t = songToTrack(item as YTMusicSong);
    t.itemType = "song";
    return t;
  }
  if (item.type === "VIDEO") {
    const t = videoToTrack(item as YTMusicVideo);
    t.itemType = "video";
    return t;
  }
  if (item.type === "ARTIST") {
    return artistSearchToTrack(item as YTMusicArtistDetailed);
  }
  if (item.type === "ALBUM") {
    return albumSearchToTrack(item as YTMusicAlbumDetailed);
  }
  if (item.type === "PLAYLIST") {
    return playlistSearchToTrack(item as YTMusicPlaylistDetailed);
  }
  return null;
}

function artistSearchToTrack(a: YTMusicArtistDetailed): RakuTrack {
  return {
    id: a.artistId,
    name: a.name,
    artists: [{ id: a.artistId, name: a.name }],
    album: {
      id: "",
      name: "",
      images:
        a.thumbnails.length > 0
          ? [
              {
                url: a.thumbnails[a.thumbnails.length - 1].url,
                width: 480,
                height: 480,
              },
            ]
          : [],
    },
    duration_ms: 0,
    uri: a.artistId,
    preview_url: null,
    provider: "youtube",
    itemType: "artist",
  };
}

function albumSearchToTrack(a: YTMusicAlbumDetailed): RakuTrack {
  return {
    id: a.playlistId || a.albumId,
    name: a.name,
    artists: [{ id: a.artist.artistId || "", name: a.artist.name }],
    album: {
      id: a.albumId,
      name: a.name,
      images:
        a.thumbnails.length > 0
          ? [
              {
                url: a.thumbnails[a.thumbnails.length - 1].url,
                width: 480,
                height: 480,
              },
            ]
          : [],
    },
    duration_ms: 0,
    uri: a.playlistId || a.albumId,
    preview_url: null,
    provider: "youtube",
    itemType: "album",
  };
}

function playlistSearchToTrack(p: YTMusicPlaylistDetailed): RakuTrack {
  return {
    id: p.playlistId,
    name: p.name,
    artists: [{ id: p.artist.artistId || "", name: p.artist.name }],
    album: {
      id: "",
      name: p.name,
      images:
        p.thumbnails.length > 0
          ? [
              {
                url: p.thumbnails[p.thumbnails.length - 1].url,
                width: 480,
                height: 480,
              },
            ]
          : [],
    },
    duration_ms: 0,
    uri: p.playlistId,
    preview_url: null,
    provider: "youtube",
    itemType: "playlist",
  };
}

// ホームセクション取得 (via ytmusic-api)
export async function getYouTubeHomeSections(): Promise<
  { title: string; tracks: RakuTrack[] }[]
> {
  if (!window.ytmusicAPI) return [];
  const sections = await window.ytmusicAPI.getHomeSections();
  return sections
    .map((section) => ({
      title: section.title,
      tracks: (section.contents || [])
        .filter((item) => item != null)
        .map(homeItemToTrack)
        .filter((t): t is RakuTrack => t !== null),
    }))
    .filter((s) => s.tracks.length > 0);
}

// お気に入り（いいねした曲） — via innertube browse API with session cookies
export async function getYouTubeLikedSongs(): Promise<RakuTrack[]> {
  if (!window.ytmusicAPI) return [];
  try {
    const tracks = await window.ytmusicAPI.getLikedSongs();
    return tracks.map(innertubeTrackToRaku);
  } catch {
    return [];
  }
}

// 再生履歴 — via innertube browse API with session cookies
export async function getYouTubeHistory(): Promise<RakuTrack[]> {
  if (!window.ytmusicAPI) return [];
  try {
    const tracks = await window.ytmusicAPI.getHistory();
    return tracks.map(innertubeTrackToRaku);
  } catch {
    return [];
  }
}

// ライブラリプレイリスト — playlists.list equivalent
export async function getYouTubeLibraryPlaylists(): Promise<
  LibraryPlaylistItem[]
> {
  if (!window.ytmusicAPI) return [];
  try {
    return await window.ytmusicAPI.getLibraryPlaylists();
  } catch {
    return [];
  }
}

// サブスクリプション — subscriptions.list equivalent
export async function getYouTubeSubscriptions(): Promise<SubscriptionItem[]> {
  if (!window.ytmusicAPI) return [];
  try {
    return await window.ytmusicAPI.getSubscriptions();
  } catch {
    return [];
  }
}

// Convert innertube track to RakuTrack
function innertubeTrackToRaku(t: InnertubeTrack): RakuTrack {
  return {
    id: t.videoId,
    name: t.title || "不明な曲",
    artists: [{ id: t.artistId || "", name: t.artistName || "" }],
    album: {
      id: t.albumId || "",
      name: t.albumName || "",
      images: t.thumbnail
        ? [{ url: t.thumbnail, width: 480, height: 480 }]
        : [],
    },
    duration_ms: t.durationMs || 0,
    uri: t.videoId,
    preview_url: null,
    provider: "youtube",
  };
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
      uploadsPlaylistId: "",
    };
  } catch {
    return null;
  }
}

// アーティストのトップ曲取得 (via ytmusic-api)
export async function getYouTubePlaylistItems(
  playlistId: string,
  _maxResults = 20,
): Promise<RakuTrack[]> {
  if (!window.ytmusicAPI) return [];
  try {
    if (playlistId.startsWith("UC")) {
      const songs = await window.ytmusicAPI.getArtistSongs(playlistId);
      return songs.map(songToTrack);
    }
    const videos = await window.ytmusicAPI.getPlaylistVideos(playlistId);
    return videos.map(videoToTrack);
  } catch {
    return [];
  }
}

// --- Write operations ---

/**
 * Parse a YouTube URL and extract the video ID.
 * Supports youtube.com/watch, youtu.be, music.youtube.com/watch, youtube.com/shorts, etc.
 * Returns null if the input is not a valid YouTube URL.
 */
export function parseYouTubeUrl(input: string): string | null {
  const trimmed = input.trim();
  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, "");
    if (
      host === "youtube.com" ||
      host === "music.youtube.com" ||
      host === "m.youtube.com"
    ) {
      // /watch?v=VIDEO_ID
      const v = url.searchParams.get("v");
      if (v && /^[\w-]{11}$/.test(v)) return v;
      // /shorts/VIDEO_ID or /embed/VIDEO_ID
      const pathMatch = url.pathname.match(/^\/(shorts|embed)\/([\w-]{11})/);
      if (pathMatch) return pathMatch[2];
      return null;
    }
    if (host === "youtu.be") {
      const id = url.pathname.slice(1).split("/")[0];
      if (/^[\w-]{11}$/.test(id)) return id;
      return null;
    }
  } catch {
    // not a valid URL
  }
  return null;
}

/**
 * Create a minimal RakuTrack from a video ID (for direct URL playback).
 * The track will have placeholder metadata that gets shown until playback starts.
 */
export function createTrackFromVideoId(videoId: string): RakuTrack {
  return {
    id: videoId,
    name: `YouTube — ${videoId}`,
    artists: [{ id: "", name: "YouTube" }],
    album: {
      id: "",
      name: "",
      images: [
        {
          url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          width: 480,
          height: 360,
        },
      ],
    },
    duration_ms: 0,
    uri: videoId,
    preview_url: null,
    provider: "youtube",
    itemType: "video",
  };
}

// Report playback to YouTube (updates server-side history)
export async function reportYouTubePlayback(videoId: string): Promise<boolean> {
  if (!window.ytmusicAPI?.reportPlayback) return false;
  try {
    const result = await window.ytmusicAPI.reportPlayback(videoId);
    return result.success;
  } catch {
    return false;
  }
}

// Like / unlike a song on YouTube Music
export async function rateYouTubeSong(
  videoId: string,
  rating: "LIKE" | "DISLIKE" | "INDIFFERENT",
): Promise<boolean> {
  if (!window.ytmusicAPI?.rateSong) return false;
  try {
    const result = await window.ytmusicAPI.rateSong(videoId, rating);
    return result.success;
  } catch {
    return false;
  }
}

// Create a new playlist on YouTube Music
export async function createYouTubePlaylist(
  title: string,
  videoIds?: string[],
): Promise<string | null> {
  if (!window.ytmusicAPI?.createPlaylist) return null;
  try {
    const result = await window.ytmusicAPI.createPlaylist(title, videoIds);
    return result.success ? result.playlistId || null : null;
  } catch {
    return null;
  }
}

// Add songs to an existing YouTube Music playlist
export async function addToYouTubePlaylist(
  playlistId: string,
  videoIds: string[],
): Promise<boolean> {
  if (!window.ytmusicAPI?.addToPlaylist) return false;
  try {
    const result = await window.ytmusicAPI.addToPlaylist(playlistId, videoIds);
    return result.success;
  } catch {
    return false;
  }
}

// Remove songs from a YouTube Music playlist
export async function removeFromYouTubePlaylist(
  playlistId: string,
  videoIds: string[],
  setVideoIds?: string[],
): Promise<boolean> {
  if (!window.ytmusicAPI?.removeFromPlaylist) return false;
  try {
    const result = await window.ytmusicAPI.removeFromPlaylist(
      playlistId,
      videoIds,
      setVideoIds,
    );
    return result.success;
  } catch {
    return false;
  }
}

// Delete a YouTube Music playlist
export async function deleteYouTubePlaylist(
  playlistId: string,
): Promise<boolean> {
  if (!window.ytmusicAPI?.deletePlaylist) return false;
  try {
    const result = await window.ytmusicAPI.deletePlaylist(playlistId);
    return result.success;
  } catch {
    return false;
  }
}
