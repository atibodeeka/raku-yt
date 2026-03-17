// YouTube authentication via Electron browser window login

declare global {
  interface Window {
    youtubeAuth?: {
      openLogin: () => Promise<{
        success: boolean;
        user?: { name: string; avatar: string };
        isPremium?: boolean;
        error?: string;
      }>;
      logout: () => Promise<void>;
      checkLogin: () => Promise<boolean>;
      isPremium: () => Promise<boolean>;
    };
  }
}

export async function openYouTubeLogin(): Promise<{
  success: boolean;
  user?: { name: string; avatar: string };
  isPremium?: boolean;
  error?: string;
}> {
  if (!window.youtubeAuth) {
    return { success: false, error: "not_electron" };
  }
  return window.youtubeAuth.openLogin();
}

export async function logoutYouTube(): Promise<void> {
  if (!window.youtubeAuth) return;
  return window.youtubeAuth.logout();
}

export async function checkYouTubeLogin(): Promise<boolean> {
  if (!window.youtubeAuth) return false;
  return window.youtubeAuth.checkLogin();
}

export async function checkYouTubePremium(): Promise<boolean> {
  if (!window.youtubeAuth) return false;
  return window.youtubeAuth.isPremium();
}
