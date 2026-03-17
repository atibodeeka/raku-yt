"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { openYouTubeLogin } from "@/lib/youtube-auth";
import { saveLogin } from "@/lib/auth-storage";
import { FaYoutube } from "react-icons/fa";

export default function LoginScreen() {
  const language = useStore((s) => s.language);
  const setLoggedIn = useStore((s) => s.setLoggedIn);
  const setProvider = useStore((s) => s.setProvider);
  const setUser = useStore((s) => s.setUser);
  const setYtPremium = useStore((s) => s.setYtPremium);
  const [loggingIn, setLoggingIn] = useState(false);
  const descParts = t("login.description", language).split("\n");

  const handleLogin = async () => {
    setLoggingIn(true);
    try {
      const result = await openYouTubeLogin();
      if (result.success && result.user) {
        setProvider("youtube");
        setLoggedIn(true);
        setUser({
          display_name: result.user.name,
          avatar: result.user.avatar,
        });
        setYtPremium(result.isPremium ?? false);
        saveLogin(result.user.name, result.user.avatar);
      }
    } catch (err) {
      console.error("Login failed:", err);
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-melon-header">
      <div className="text-center">
        {/* Logo */}
        <div className="mb-8">
          <h1
            className="text-6xl font-bold text-melon-green mb-2"
            style={{ fontFamily: "var(--font-round)" }}>
            楽
          </h1>
          <p className="text-melon-muted text-sm tracking-[0.3em]">
            RAKU PLAYER
          </p>
        </div>

        {/* Retro decorative line */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="h-px w-16 bg-gray-600" />
          <span className="text-gray-500 text-xs">♪</span>
          <div className="h-px w-16 bg-gray-600" />
        </div>

        {/* Description */}
        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
          {descParts.map((line, i) => (
            <span key={i}>
              {line}
              {i < descParts.length - 1 && <br />}
            </span>
          ))}
        </p>

        {/* Login button */}
        <div className="flex flex-col gap-3 items-center">
          <button
            onClick={handleLogin}
            disabled={loggingIn}
            className="w-64 inline-flex items-center justify-center gap-3 bg-[#FF0000] hover:bg-[#CC0000] text-white font-bold py-3 px-8 rounded-full transition-all hover:shadow-lg hover:shadow-[#FF0000]/20 active:scale-95 disabled:opacity-50">
            {loggingIn ? (
              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <FaYoutube size={20} />
            )}
            <span>
              {loggingIn
                ? t("login.loggingIn", language)
                : t("login.youtube", language)}
            </span>
          </button>
        </div>

        {/* Footer */}
        <p className="text-gray-600 text-xs mt-12">Powered by YouTube Music</p>
      </div>
    </div>
  );
}
