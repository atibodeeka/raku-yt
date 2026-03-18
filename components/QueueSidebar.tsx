"use client";

import { useStore, RakuTrack } from "@/lib/store";
import { formatTime } from "@/lib/utils";
import { t } from "@/lib/i18n";
import {
  FiList,
  FiMusic,
  FiTrash2,
  FiChevronUp,
  FiChevronDown,
  FiX,
  FiPlay,
} from "react-icons/fi";

export default function QueueSidebar() {
  const language = useStore((s) => s.language);
  const queue = useStore((s) => s.queue);
  const queueIndex = useStore((s) => s.queueIndex);
  const isPlaying = useStore((s) => s.isPlaying);
  const setQueue = useStore((s) => s.setQueue);
  const setCurrentTrack = useStore((s) => s.setCurrentTrack);
  const setIsPlaying = useStore((s) => s.setIsPlaying);
  const addToYouTubeHistory = useStore((s) => s.addToYouTubeHistory);
  const removeFromQueue = useStore((s) => s.removeFromQueue);
  const provider = useStore((s) => s.provider);
  const showToast = useStore((s) => s.showToast);

  const handlePlayFromQueue = (index: number) => {
    const track = queue[index];
    if (!track) return;
    setQueue(queue, index);
    setCurrentTrack(track);
    setIsPlaying(true);
    if (provider === "youtube") {
      addToYouTubeHistory(track);
    }
  };

  const handleRemoveFromQueue = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const trackName = queue[index]?.name;
    removeFromQueue(index);
    showToast(`${trackName} — Removed`);
  };

  const handleMoveInQueue = (
    e: React.MouseEvent,
    index: number,
    direction: "up" | "down",
  ) => {
    e.stopPropagation();
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= queue.length) return;
    const newQueue = [...queue];
    [newQueue[index], newQueue[newIndex]] = [
      newQueue[newIndex],
      newQueue[index],
    ];
    let newQueueIndex = queueIndex;
    if (queueIndex === index) newQueueIndex = newIndex;
    else if (queueIndex === newIndex) newQueueIndex = index;
    setQueue(newQueue, newQueueIndex);
  };

  const handleClearQueue = () => {
    setQueue([], -1);
    setCurrentTrack(null);
    setIsPlaying(false);
    showToast(t("queue.cleared", language));
  };

  return (
    <aside className="w-64 bg-white border-l border-gray-200 flex flex-col shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <FiList size={14} className="text-melon-green" />
          <span
            className="text-sm font-bold text-gray-800"
            style={{ fontFamily: "var(--font-round)" }}>
            {t("queue.title", language)}
          </span>
          <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
            {queue.length}
          </span>
        </div>
        {queue.length > 0 && (
          <button
            onClick={handleClearQueue}
            className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-red-500 transition-colors px-1.5 py-0.5 rounded hover:bg-red-50"
            title={t("queue.clear", language)}>
            <FiTrash2 size={10} />
            {t("queue.clear", language)}
          </button>
        )}
      </div>

      {/* Queue items */}
      <div className="flex-1 overflow-y-auto">
        {queue.length > 0 ? (
          <>
            {/* Now playing section */}
            {queueIndex >= 0 && queueIndex < queue.length && (
              <div className="px-3 py-1.5 bg-melon-green/5 border-b border-gray-100">
                <span className="text-[10px] text-melon-green font-medium uppercase tracking-wider">
                  {t("queue.nowPlaying", language)}
                </span>
              </div>
            )}

            {queue.map((track: RakuTrack, index: number) => {
              const isCurrent = index === queueIndex;
              return (
                <div key={`queue-${track.id}-${index}`}>
                  {/* Next Up divider */}
                  {index === queueIndex + 1 && (
                    <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100">
                      <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                        {t("queue.nextUp", language)}
                      </span>
                    </div>
                  )}
                  <div
                    onDoubleClick={() => handlePlayFromQueue(index)}
                    className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer group transition-colors border-b border-gray-50 ${
                      isCurrent
                        ? "bg-melon-green/8 border-l-[3px] border-l-melon-green"
                        : "hover:bg-gray-50 border-l-[3px] border-l-transparent"
                    }`}>
                    {/* Index / play indicator */}
                    <span
                      className={`w-4 text-right text-[11px] shrink-0 ${
                        isCurrent
                          ? "text-melon-green font-bold"
                          : "text-gray-400"
                      }`}>
                      {isCurrent && isPlaying ? (
                        <FiPlay
                          size={10}
                          className="text-melon-green fill-current"
                        />
                      ) : (
                        index + 1
                      )}
                    </span>

                    {/* Thumbnail */}
                    <div className="w-8 h-8 rounded bg-gray-100 overflow-hidden shrink-0 border border-gray-100">
                      {track.album?.images?.[0]?.url ? (
                        <img
                          src={track.album.images[0].url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FiMusic size={10} className="text-gray-300" />
                        </div>
                      )}
                    </div>

                    {/* Track info */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs truncate font-medium ${isCurrent ? "text-melon-green" : "text-gray-800"}`}>
                        {track.name}
                      </p>
                      {track.artists?.length > 0 && (
                        <p className="text-[10px] truncate text-gray-400">
                          {track.artists.map((a) => a.name).join(", ")}
                        </p>
                      )}
                    </div>

                    {/* Duration */}
                    <span className="text-[10px] text-gray-400 shrink-0">
                      {formatTime(track.duration_ms)}
                    </span>

                    {/* Move up/down */}
                    <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-all shrink-0">
                      <button
                        onClick={(e) => handleMoveInQueue(e, index, "up")}
                        disabled={index === 0}
                        className="p-0 text-gray-400 hover:text-melon-green disabled:opacity-30"
                        title={t("compact.moveUp", language)}>
                        <FiChevronUp size={10} />
                      </button>
                      <button
                        onClick={(e) => handleMoveInQueue(e, index, "down")}
                        disabled={index === queue.length - 1}
                        className="p-0 text-gray-400 hover:text-melon-green disabled:opacity-30"
                        title={t("compact.moveDown", language)}>
                        <FiChevronDown size={10} />
                      </button>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={(e) => handleRemoveFromQueue(e, index)}
                      className="p-0.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                      title="Remove">
                      <FiX size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2 px-4">
            <FiList size={28} className="text-gray-200" />
            <p className="text-gray-400 text-xs text-center">
              {t("queue.empty", language)}
            </p>
            <p className="text-gray-300 text-[10px] text-center">
              {t("queue.emptyHint", language)}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
