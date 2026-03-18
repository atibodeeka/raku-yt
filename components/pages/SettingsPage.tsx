"use client";

import { useStore } from "@/lib/store";
import { t, Language } from "@/lib/i18n";
import PageHeader from "@/components/ui/PageHeader";
import { FiSettings, FiGlobe, FiMonitor } from "react-icons/fi";

const languages: { code: Language; label: string; flag: string }[] = [
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
];

export default function SettingsPage() {
  const language = useStore((s) => s.language);
  const compactMode = useStore((s) => s.compactMode);
  const ytPremium = useStore((s) => s.ytPremium);
  const setLanguage = useStore((s) => s.setLanguage);
  const setCompactMode = useStore((s) => s.setCompactMode);

  return (
    <div className="p-6">
      <PageHeader icon={FiSettings} title={t("settings.title", language)} />

      {/* Language */}
      <section className="mb-8">
        <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
          <FiGlobe size={14} className="text-melon-green" />
          {t("settings.language", language)}
        </h2>
        <div className="flex gap-2">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded border text-sm transition-all ${
                language === lang.code
                  ? "border-melon-green bg-melon-green/10 text-melon-green font-medium shadow-sm"
                  : "border-gray-200 bg-white text-gray-600 hover:border-melon-green/50 hover:bg-gray-50"
              }`}>
              <span className="text-base">{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Appearance */}
      <section className="mb-8">
        <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
          <FiMonitor size={14} className="text-melon-green" />
          {t("settings.appearance", language)}
        </h2>

        {/* Compact Mode Toggle */}
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded px-4 py-3">
          <div>
            <p className="text-sm text-gray-800 font-medium">
              {t("settings.compactMode", language)}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {t("settings.compactDesc", language)}
            </p>
          </div>
          <button
            onClick={() => setCompactMode(!compactMode)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              compactMode ? "bg-melon-green" : "bg-gray-300"
            }`}>
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                compactMode ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </section>
    </div>
  );
}
