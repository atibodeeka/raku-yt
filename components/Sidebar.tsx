"use client";

import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { clearTokens } from "@/lib/auth-storage";
import {
  FiHome,
  FiSearch,
  FiHeart,
  FiClock,
  FiMusic,
  FiLogOut,
  FiUser,
  FiSettings,
} from "react-icons/fi";

const navItems = [
  { id: "home", labelKey: "nav.home" as const, icon: FiHome },
  { id: "search", labelKey: "nav.search" as const, icon: FiSearch },
  { id: "liked", labelKey: "nav.liked" as const, icon: FiHeart },
  { id: "history", labelKey: "nav.history" as const, icon: FiClock },
  { id: "lyrics", labelKey: "nav.lyrics" as const, icon: FiMusic },
  { id: "settings", labelKey: "nav.settings" as const, icon: FiSettings },
];

export default function Sidebar() {
  const currentPage = useStore((s) => s.currentPage);
  const setCurrentPage = useStore((s) => s.setCurrentPage);
  const user = useStore((s) => s.user);
  const provider = useStore((s) => s.provider);
  const clearAuth = useStore((s) => s.clearAuth);
  const language = useStore((s) => s.language);

  const handleLogout = () => {
    clearTokens();
    clearAuth();
  };

  const providerLabel = "YouTube";

  return (
    <aside className="w-48 bg-melon-sidebar flex flex-col shrink-0">
      {/* User profile area */}
      <div className="px-4 py-4 border-b border-melon-darkborder">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden border border-gray-500">
            {user?.images?.[0]?.url ? (
              <img
                src={user.images[0].url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <FiUser size={14} className="text-gray-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white truncate font-medium">
              {user?.display_name || t("user.default", language)}
            </p>
            <p className="text-[10px] text-gray-400 truncate">
              {providerLabel}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3">
        <div className="px-4 mb-2">
          <p className="text-[10px] text-gray-500 tracking-[0.15em] uppercase font-medium">
            {t("nav.menu", language)}
          </p>
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2 text-[13px] transition-colors ${
                isActive
                  ? "text-melon-green bg-melon-green/15 border-l-[3px] border-melon-green font-medium"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}>
              <Icon size={15} />
              <span>{t(item.labelKey, language)}</span>
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-4 py-3 border-t border-melon-darkborder">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-500 hover:text-red-400 rounded transition-colors hover:bg-white/5">
          <FiLogOut size={12} />
          <span>{t("nav.logout", language)}</span>
        </button>
      </div>
    </aside>
  );
}
