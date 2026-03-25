"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { PlayState, VocabItemResponse } from "@/lib/types";

interface VocabRowProps {
  item: VocabItemResponse;
  delay: number;
  repeatCount: number;
  isActive: boolean;
  onAudioStatusChange: (itemId: string, audioUrl: string) => void;
  onAutoPlayComplete?: () => void;
  onItemUpdate: (item: VocabItemResponse) => void;
  onItemDelete: (itemId: string) => void;
}

export default function VocabRow({
  item,
  delay,
  repeatCount,
  isActive,
  onAudioStatusChange,
  onAutoPlayComplete,
  onItemUpdate,
  onItemDelete,
}: VocabRowProps) {
  // Audio Playback State
  const [playState, setPlayState] = useState<PlayState>("idle");
  const [currentLoop, setCurrentLoop] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [localAudioUrl, setLocalAudioUrl] = useState<string | null>(item.audioUrl);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editArabicPrimary, setEditArabicPrimary] = useState(item.arabicPrimary);
  const [editArabicFull, setEditArabicFull] = useState(item.arabicFull || "");
  const [editEnglish, setEditEnglish] = useState(item.english || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Keep localAudioUrl in sync
  useEffect(() => {
    if (item.audioUrl !== localAudioUrl) {
      setLocalAudioUrl(item.audioUrl);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.audioUrl]);

  // Keep text states in sync
  useEffect(() => {
    setEditArabicPrimary(item.arabicPrimary);
    setEditArabicFull(item.arabicFull || "");
    setEditEnglish(item.english || "");
  }, [item]);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  const playAudio = useCallback(
    (url: string, loopIndex: number, isAutoMode: boolean) => {
      const audio = new Audio(url);
      audioRef.current = audio;

      setPlayState("playing");
      setCurrentLoop(loopIndex);

      audio.onended = () => {
        if (loopIndex < repeatCount) {
          setPlayState("waiting");
          timeoutRef.current = setTimeout(() => {
            playAudio(url, loopIndex + 1, isAutoMode);
          }, delay * 1000);
        } else {
          setPlayState("idle");
          setCurrentLoop(0);
          if (isAutoMode && onAutoPlayComplete) {
            onAutoPlayComplete();
          }
        }
      };

      audio.onerror = () => {
        setPlayState("error");
        if (isAutoMode && onAutoPlayComplete) onAutoPlayComplete();
      };

      audio.play().catch(() => {
        setPlayState("error");
        if (isAutoMode && onAutoPlayComplete) onAutoPlayComplete();
      });
    },
    [delay, repeatCount, onAutoPlayComplete]
  );

  const handlePlay = useCallback(async (isAutoMode = false) => {
    if (playState !== "idle" && playState !== "error") {
      cleanup();
      setPlayState("idle");
      setCurrentLoop(0);
      return;
    }

    if (localAudioUrl) {
      playAudio(localAudioUrl, 1, isAutoMode);
      return;
    }

    setPlayState("loading");

    try {
      const res = await fetch(`/api/tts/${item.id}`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setPlayState("error");
        if (isAutoMode && onAutoPlayComplete) onAutoPlayComplete();
        return;
      }

      setLocalAudioUrl(data.audioUrl);
      onAudioStatusChange(item.id, data.audioUrl);
      playAudio(data.audioUrl, 1, isAutoMode);
    } catch {
      setPlayState("error");
      if (isAutoMode && onAutoPlayComplete) onAutoPlayComplete();
    }
  }, [playState, localAudioUrl, item.id, playAudio, cleanup, onAudioStatusChange, onAutoPlayComplete]);

  // Handle active prop from auto-play orchestrator
  useEffect(() => {
    if (isActive && playState === "idle" && !isEditing) {
      handlePlay(true);
    } else if (!isActive && playState !== "idle" && playState !== "error") {
      cleanup();
      setPlayState("idle");
      setCurrentLoop(0);
    }
  }, [isActive, playState, isEditing, handlePlay, cleanup]);

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          arabicPrimary: editArabicPrimary.trim(),
          arabicFull: editArabicFull.trim(),
          english: editEnglish.trim(),
        }),
      });

      if (res.ok) {
        const updatedItem = await res.json();
        onItemUpdate(updatedItem);
        setIsEditing(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this word?")) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/items/${item.id}`, { method: "DELETE" });
      if (res.ok) {
        onItemDelete(item.id);
      } else {
        setIsDeleting(false);
      }
    } catch (err) {
      console.error(err);
      setIsDeleting(false);
    }
  };

  const showDifferent = item.arabicFull !== item.arabicPrimary && item.arabicFull;

  if (isEditing) {
    return (
      <tr className="border-b border-indigo-100 bg-indigo-50/40">
        <td className="py-4 px-4 text-center text-sm text-gray-400 font-mono">
          {item.position + 1}
        </td>
        <td className="py-4 px-4" dir="rtl">
          <input
            type="text"
            className="w-full font-arabic text-xl px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-right placeholder-gray-400 bg-white"
            value={editArabicPrimary}
            onChange={(e) => setEditArabicPrimary(e.target.value)}
            placeholder="Arabic text"
            dir="rtl"
          />
          <input
            type="text"
            className="w-full font-arabic text-sm mt-2 px-3 py-1.5 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-right placeholder-gray-400 bg-white/70"
            value={editArabicFull}
            onChange={(e) => setEditArabicFull(e.target.value)}
            placeholder="Full pronunciation (optional)"
            dir="rtl"
          />
        </td>
        <td className="py-4 px-4">
          <textarea
            className="w-full text-base px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none placeholder-gray-400 bg-white"
            rows={2}
            value={editEnglish}
            onChange={(e) => setEditEnglish(e.target.value)}
            placeholder="English translation"
          />
        </td>
        <td className="py-4 px-4 text-xs font-medium text-amber-600">
          * Saving changes will clear old audio.
        </td>
        <td className="py-4 px-4 whitespace-nowrap text-right">
          <div className="flex flex-col gap-2 items-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-md hover:bg-indigo-700 transition ${isSaving ? 'opacity-50' : ''}`}
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => setIsEditing(false)}
              disabled={isSaving}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-bold rounded-md hover:bg-gray-300 transition"
            >
              Cancel
            </button>
          </div>
        </td>
      </tr>
    );
  }

  const getButtonIcon = () => {
    switch (playState) {
      case "loading":
        return <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />;
      case "playing":
        return (
          <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        );
      case "waiting":
        return (
          <div className="relative w-4 h-4">
            <div className="absolute inset-0 bg-indigo-200 rounded-full animate-ping opacity-50" />
            <div className="relative w-4 h-4 bg-indigo-400 rounded-full" />
          </div>
        );
      case "error":
        return (
          <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5.14v14l11-7-11-7z" />
          </svg>
        );
    }
  };

  return (
    <tr className={`group border-b border-gray-100 transition-colors ${isActive ? 'bg-indigo-50/50' : 'hover:bg-gray-50/50'} ${isDeleting ? 'opacity-50' : ''}`}>
      <td className="py-4 px-4 text-center text-sm text-gray-400 font-mono">
        {item.position + 1}
      </td>
      <td className="py-4 px-4" dir="rtl" lang="ar">
        <span className="font-arabic text-2xl text-gray-900 leading-relaxed cursor-text" onDoubleClick={() => setIsEditing(true)}>
          {item.arabicPrimary}
        </span>
        {showDifferent && (
          <span className="block font-arabic text-sm text-gray-400 mt-1 cursor-text" onDoubleClick={() => setIsEditing(true)}>
            {item.arabicFull}
          </span>
        )}
      </td>
      <td className="py-4 px-4 text-gray-600 cursor-text" onDoubleClick={() => setIsEditing(true)}>
        {item.english || "—"}
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePlay(false)}
            disabled={playState === "loading"}
            className={`
              w-9 h-9 flex items-center justify-center rounded-full
              transition-all duration-200 shrink-0
              ${playState === "error" ? "bg-red-50 hover:bg-red-100" : "bg-indigo-50 hover:bg-indigo-100"}
              ${isActive ? "ring-2 ring-indigo-400 ring-offset-1" : ""}
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {getButtonIcon()}
          </button>
          <div className="min-w-[100px]">
            {playState !== "idle" && (
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {playState === "loading" && "Generating…"}
                {playState === "playing" && `Playing (${currentLoop}/${repeatCount})`}
                {playState === "waiting" && `Waiting ${delay}s…`}
                {playState === "error" && "Error — retry"}
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="py-4 px-4 text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setIsEditing(true)}
            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
            title="Edit word"
            disabled={isDeleting}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            title="Delete word"
            disabled={isDeleting}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}
