// Spotify Web API client wrapper

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

async function fetchSpotify(
  endpoint: string,
  accessToken: string,
  options?: RequestInit,
) {
  const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("UNAUTHORIZED");
    }
    throw new Error(`Spotify API Error: ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

// ユーザー情報
export async function getCurrentUser(token: string) {
  return fetchSpotify("/me", token);
}

// 楽曲検索
export async function searchTracks(
  token: string,
  query: string,
  limit = 20,
  offset = 0,
) {
  const params = new URLSearchParams({
    q: query,
    type: "track",
    limit: limit.toString(),
    offset: offset.toString(),
    market: "JP",
  });
  return fetchSpotify(`/search?${params}`, token);
}

// 再生制御
export async function play(
  token: string,
  uris?: string[],
  contextUri?: string,
  offset?: number,
) {
  const body: Record<string, unknown> = {};
  if (uris) body.uris = uris;
  if (contextUri) body.context_uri = contextUri;
  if (offset !== undefined) body.offset = { position: offset };

  return fetchSpotify("/me/player/play", token, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function pause(token: string) {
  return fetchSpotify("/me/player/pause", token, { method: "PUT" });
}

export async function skipToNext(token: string) {
  return fetchSpotify("/me/player/next", token, { method: "POST" });
}

export async function skipToPrevious(token: string) {
  return fetchSpotify("/me/player/previous", token, { method: "POST" });
}

export async function seek(token: string, positionMs: number) {
  return fetchSpotify(`/me/player/seek?position_ms=${positionMs}`, token, {
    method: "PUT",
  });
}

export async function setVolume(token: string, volumePercent: number) {
  return fetchSpotify(
    `/me/player/volume?volume_percent=${volumePercent}`,
    token,
    { method: "PUT" },
  );
}

export async function setShuffle(token: string, state: boolean) {
  return fetchSpotify(`/me/player/shuffle?state=${state}`, token, {
    method: "PUT",
  });
}

export async function setRepeat(
  token: string,
  state: "off" | "context" | "track",
) {
  return fetchSpotify(`/me/player/repeat?state=${state}`, token, {
    method: "PUT",
  });
}

// 現在再生中
export async function getCurrentPlayback(token: string) {
  return fetchSpotify("/me/player", token);
}

// 再生履歴
export async function getRecentlyPlayed(token: string, limit = 50) {
  return fetchSpotify(`/me/player/recently-played?limit=${limit}`, token);
}

// お気に入り楽曲
export async function getSavedTracks(token: string, limit = 50, offset = 0) {
  return fetchSpotify(
    `/me/tracks?limit=${limit}&offset=${offset}&market=JP`,
    token,
  );
}

export async function saveTracks(token: string, ids: string[]) {
  return fetchSpotify("/me/tracks", token, {
    method: "PUT",
    body: JSON.stringify({ ids }),
  });
}

export async function removeSavedTracks(token: string, ids: string[]) {
  return fetchSpotify("/me/tracks", token, {
    method: "DELETE",
    body: JSON.stringify({ ids }),
  });
}

// 新着リリース
export async function getNewReleases(token: string, limit = 20) {
  return fetchSpotify(`/browse/new-releases?country=JP&limit=${limit}`, token);
}

// おすすめ
export async function getFeaturedPlaylists(token: string, limit = 20) {
  return fetchSpotify(
    `/browse/featured-playlists?country=JP&limit=${limit}&locale=ja_JP`,
    token,
  );
}
