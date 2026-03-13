"use client";

import { FiMinus, FiSquare, FiX } from "react-icons/fi";

declare global {
  interface Window {
    electronAPI?: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      setCompactMode?: (compact: boolean) => void;
    };
  }
}

export default function TitleBar() {
  const isElectron = typeof window !== "undefined" && window.electronAPI;

  return (
    <div className="titlebar-drag h-10 bg-melon-header flex items-center justify-between px-4 select-none shrink-0">
      {/* Left: Logo + Navigation labels */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span
            className="text-melon-green font-bold text-lg"
            style={{ fontFamily: "var(--font-round)" }}>
            ♪
          </span>
          <span className="text-white font-bold text-base tracking-wide">
            楽
          </span>
        </div>
        <div className="h-4 w-px bg-gray-600" />
        <span className="text-gray-400 text-xs">PLAYER</span>
      </div>

      {/* Center: Brand */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <span
          className="text-melon-green font-bold text-xl tracking-wider"
          style={{ fontFamily: "var(--font-round)" }}>
          Raku
        </span>
      </div>

      {/* Right: Window controls */}
      <div className="flex items-center gap-2">
        {isElectron && (
          <div className="titlebar-nodrag flex items-center gap-0.5">
            <button
              onClick={() => window.electronAPI?.minimize()}
              className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded transition-colors">
              <FiMinus size={12} className="text-gray-400" />
            </button>
            <button
              onClick={() => window.electronAPI?.maximize()}
              className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded transition-colors">
              <FiSquare size={10} className="text-gray-400" />
            </button>
            <button
              onClick={() => window.electronAPI?.close()}
              className="w-7 h-7 flex items-center justify-center hover:bg-red-500/80 rounded transition-colors">
              <FiX size={12} className="text-gray-400" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
