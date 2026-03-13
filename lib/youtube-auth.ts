// Google OAuth 2.0 for YouTube Data API

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const CLIENT_SECRET = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET || "";
const REDIRECT_URI =
  process.env.NEXT_PUBLIC_REDIRECT_URI || "http://127.0.0.1:3000/callback";

const SCOPES = [
  "https://www.googleapis.com/auth/youtube",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

export async function redirectToYouTubeAuth(): Promise<void> {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state: "youtube",
  });

  window.location.href = `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeYouTubeCodeForToken(
  code: string,
): Promise<YouTubeTokenResponse> {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    grant_type: "authorization_code",
    redirect_uri: REDIRECT_URI,
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Google token error:", response.status, errorBody);
    throw new Error(`YouTubeトークン交換に失敗しました: ${errorBody}`);
  }

  return response.json();
}

export async function refreshYouTubeToken(
  refreshToken: string,
): Promise<YouTubeTokenResponse> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error("YouTubeトークンのリフレッシュに失敗しました");
  }

  return response.json();
}

export interface YouTubeTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}
