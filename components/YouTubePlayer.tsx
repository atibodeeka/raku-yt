"use client";

import { useEffect, useRef, useCallback } from "react";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";

declare global {
  interface Window {
    ytdlpAPI?: {
      getAudioUrl: (
        videoId: string,
      ) => Promise<{ url?: string; error?: string; message?: string }>;
      check: () => Promise<{ installed: boolean; version?: string }>;
    };
  }
}

// Singleton Audio element shared across the app
let audioEl: HTMLAudioElement | null = null;

function getAudio(): HTMLAudioElement {
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.preload = "auto";
  }
  return audioEl;
}

export function useYouTubePlayer(onEnded?: () => void) {
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  const currentVideoIdRef = useRef<string | null>(null);

  const {
    provider,
    currentTrack,
    volume,
    setIsPlaying,
    setProgress,
    setDuration,
  } = useStore();

  const isYouTube = provider === "youtube";

  // Setup audio event listeners
  useEffect(() => {
    if (!isYouTube) return;

    const audio = getAudio();

    const onPlay = () => useStore.getState().setIsPlaying(true);
    const onPause = () => {
      // Only mark paused if we didn't just end
      if (!audio.ended) {
        useStore.getState().setIsPlaying(false);
      }
    };
    const onEnded = () => {
      const { repeat } = useStore.getState();
      if (repeat === "track") {
        audio.currentTime = 0;
        audio.play();
      } else {
        useStore.getState().setIsPlaying(false);
        onEndedRef.current?.();
      }
    };
    const onTimeUpdate = () => {
      useStore.getState().setProgress(audio.currentTime * 1000);
    };
    const onLoadedMetadata = () => {
      useStore.getState().setDuration(audio.duration * 1000);
    };
    const onError = () => {
      const audio = getAudio();
      // Ignore AbortError from play() interrupted by pause()
      const err = audio.error;
      if (err && err.code === MediaError.MEDIA_ERR_ABORTED) return;
      const trackName = useStore.getState().currentTrack?.name || "Unknown";
      console.warn(`Audio playback error for: ${trackName}`);
      const lang = useStore.getState().language;
      useStore
        .getState()
        .showToast(`⏭ "${trackName}" ${t("player.skipFailed", lang)}`);
      useStore.getState().setIsPlaying(false);
      onEndedRef.current?.();
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("error", onError);
    };
  }, [isYouTube]);

  // Load track via yt-dlp when currentTrack changes
  useEffect(() => {
    if (!isYouTube || !currentTrack) return;

    const videoId = currentTrack.uri;
    if (currentVideoIdRef.current === videoId) return;
    currentVideoIdRef.current = videoId;

    // Stop any current playback immediately
    const audio = getAudio();
    audio.pause();
    audio.removeAttribute("src");
    audio.load();

    const trackName = currentTrack.name || "Unknown";

    useStore.getState().setIsLoadingTrack(true);

    if (!window.ytdlpAPI) {
      const lang = useStore.getState().language;
      useStore.getState().showToast(t("player.ytdlpUnavailable", lang));
      useStore.getState().setIsLoadingTrack(false);
      return;
    }

    let cancelled = false;

    const loadTrack = async () => {
      try {
        const result = await window.ytdlpAPI!.getAudioUrl(videoId);

        // Check if this load was cancelled or track changed
        if (cancelled || currentVideoIdRef.current !== videoId) return;

        if (result.url) {
          audio.src = result.url;
          audio.volume = useStore.getState().volume / 100;
          useStore.getState().setIsLoadingTrack(false);
          try {
            await audio.play();
          } catch (playErr: unknown) {
            // Ignore AbortError (play interrupted by pause/new track)
            if (
              playErr instanceof DOMException &&
              playErr.name === "AbortError"
            )
              return;
            throw playErr;
          }
        } else {
          console.warn(`yt-dlp failed for ${videoId}:`, result.error);
          const lang = useStore.getState().language;
          useStore
            .getState()
            .showToast(`⏭ "${trackName}" ${t("player.skipMessage", lang)}`);
          useStore.getState().setIsLoadingTrack(false);
          setIsPlaying(false);
          onEndedRef.current?.();
        }
      } catch (err) {
        console.error("yt-dlp load error:", err);
        if (!cancelled && currentVideoIdRef.current === videoId) {
          const lang = useStore.getState().language;
          useStore
            .getState()
            .showToast(`⏭ "${trackName}" ${t("player.skipMessage", lang)}`);
          useStore.getState().setIsLoadingTrack(false);
          setIsPlaying(false);
          onEndedRef.current?.();
        }
      }
    };

    loadTrack();

    return () => {
      cancelled = true;
    };
  }, [isYouTube, currentTrack, setIsPlaying]);

  // Sync volume
  useEffect(() => {
    if (isYouTube && audioEl) {
      audioEl.volume = volume / 100;
    }
  }, [isYouTube, volume]);

  const ytPlay = useCallback(() => {
    audioEl?.play().catch(() => {
      // Ignore play() interruptions
    });
  }, []);

  const ytPause = useCallback(() => {
    if (audioEl) {
      audioEl.pause();
    }
    useStore.getState().setIsPlaying(false);
  }, []);

  const ytSeek = useCallback((ms: number) => {
    if (audioEl) {
      audioEl.currentTime = ms / 1000;
    }
  }, []);

  const ytSetVolume = useCallback((vol: number) => {
    if (audioEl) {
      audioEl.volume = vol / 100;
    }
  }, []);

  return {
    ytPlay,
    ytPause,
    ytSeek,
    ytSetVolume,
  };
}
