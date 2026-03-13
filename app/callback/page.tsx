"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { exchangeCodeForToken } from "@/lib/spotify-auth";
import { exchangeYouTubeCodeForToken } from "@/lib/youtube-auth";
import { useStore } from "@/lib/store";
import { saveTokens } from "@/lib/auth-storage";

function CallbackContent() {
  const searchParams = useSearchParams();
  const setAuth = useStore((s) => s.setAuth);
  const setProvider = useStore((s) => s.setProvider);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const authError = searchParams.get("error");
    const state = searchParams.get("state");

    if (authError) {
      console.error("OAuth error:", authError);
      setError(`認証エラー: ${authError}`);
      return;
    }

    if (code) {
      const isYouTube = state === "youtube";
      console.log(
        "Exchange token for provider:",
        isYouTube ? "youtube" : "spotify",
      );

      const exchangeFn = isYouTube
        ? exchangeYouTubeCodeForToken(code)
        : exchangeCodeForToken(code);

      exchangeFn
        .then((data) => {
          console.log("Token exchange success, expires_in:", data.expires_in);
          const expiry = Date.now() + data.expires_in * 1000;
          const provider = isYouTube ? "youtube" : "spotify";

          setProvider(provider);
          setAuth(data.access_token, data.refresh_token || "", expiry);
          saveTokens(
            provider,
            data.access_token,
            data.refresh_token || "",
            expiry,
          );

          window.location.href = "/";
        })
        .catch((err) => {
          console.error("Token exchange failed:", err);
          setError(`トークン交換に失敗: ${err.message}`);
        });
    }
  }, [searchParams, setAuth, setProvider]);

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-melon-bg">
        <div className="text-center max-w-md">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => (window.location.href = "/")}
            className="text-melon-green hover:underline text-sm">
            ログインに戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex items-center justify-center bg-melon-bg">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-melon-green border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-melon-muted font-gothic">認証中...</p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-melon-bg">
          <div className="animate-spin w-8 h-8 border-2 border-melon-green border-t-transparent rounded-full" />
        </div>
      }>
      <CallbackContent />
    </Suspense>
  );
}
