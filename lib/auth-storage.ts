import type { Provider } from "./store";

const KEYS = {
  provider: "raku_provider",
  accessToken: "raku_access_token",
  refreshToken: "raku_refresh_token",
  tokenExpiry: "raku_token_expiry",
} as const;

export interface StoredAuth {
  provider: Provider;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: number;
}

export function saveTokens(
  provider: Provider,
  accessToken: string,
  refreshToken: string,
  tokenExpiry: number,
) {
  localStorage.setItem(KEYS.provider, provider);
  localStorage.setItem(KEYS.accessToken, accessToken);
  if (refreshToken) {
    localStorage.setItem(KEYS.refreshToken, refreshToken);
  }
  localStorage.setItem(KEYS.tokenExpiry, tokenExpiry.toString());
}

export function loadTokens(): StoredAuth | null {
  const provider = localStorage.getItem(KEYS.provider) as Provider | null;
  const accessToken = localStorage.getItem(KEYS.accessToken);
  const refreshToken = localStorage.getItem(KEYS.refreshToken);
  const tokenExpiry = localStorage.getItem(KEYS.tokenExpiry);

  if (!provider || !accessToken || !refreshToken || !tokenExpiry) return null;

  const expiry = parseInt(tokenExpiry, 10);
  if (Date.now() >= expiry) {
    clearTokens();
    return null;
  }

  return { provider, accessToken, refreshToken, tokenExpiry: expiry };
}

export function clearTokens() {
  localStorage.removeItem(KEYS.provider);
  localStorage.removeItem(KEYS.accessToken);
  localStorage.removeItem(KEYS.refreshToken);
  localStorage.removeItem(KEYS.tokenExpiry);
}
