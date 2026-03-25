"use client";

import { useState } from "react";
import type { VocabItemResponse, VideoJobResponse } from "@/lib/types";

interface GenerateVideoButtonProps {
  listId: string;
  items: VocabItemResponse[];
  onJobCreated: (job: VideoJobResponse) => void;
  onAudioStatusChange: (itemId: string, audioUrl: string) => void;
}

export default function GenerateVideoButton({
  listId,
  items,
  onJobCreated,
  onAudioStatusChange,
}: GenerateVideoButtonProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const missingAudioItems = items.filter((item) => item.audioStatus !== "READY");
  const allAudioReady = missingAudioItems.length === 0;

  const handleGenerateAudio = async () => {
    setError(null);
    setIsGeneratingAudio(true);

    for (const item of missingAudioItems) {
      try {
        const res = await fetch(`/api/tts/${item.id}`, { method: "POST" });
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error("Failed to generate audio");
        }
        
        onAudioStatusChange(item.id, data.audioUrl);
      } catch (err) {
        setError(`Failed while generating audio for word #${item.position + 1}`);
        setIsGeneratingAudio(false);
        return;
      }
    }
    
    setIsGeneratingAudio(false);
  };

  const handleGenerateVideo = async () => {
    setError(null);
    setIsCreating(true);

    try {
      const res = await fetch("/api/video-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId, delaySeconds: 3 }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create video job");
        return;
      }

      onJobCreated(data as VideoJobResponse);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  if (!allAudioReady) {
    return (
      <div className="flex flex-col items-end gap-2">
        <button
          onClick={handleGenerateAudio}
          disabled={isGeneratingAudio}
          className={`
            px-5 py-2.5 rounded-xl font-medium text-sm text-white shadow-sm
            transition-all duration-200 bg-sky-600 hover:bg-sky-700
            focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2
            ${isGeneratingAudio ? "opacity-75 cursor-wait" : ""}
          `}
        >
          {isGeneratingAudio ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating {missingAudioItems.length} remaining...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
              </svg>
              Generate Missing Audio ({missingAudioItems.length})
            </span>
          )}
        </button>
        {error && <p className="text-xs text-red-600 max-w-xs text-right mt-1">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleGenerateVideo}
        disabled={isCreating}
        className={`
          px-5 py-2.5 rounded-xl font-medium text-sm shadow-sm
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-2
          bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500
          ${isCreating ? "opacity-75 cursor-wait" : ""}
        `}
        id="generate-video-button"
      >
        {isCreating ? (
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Creating job…
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
            Generate Video
          </span>
        )}
      </button>

      {error && (
        <p className="text-xs text-red-600 max-w-xs text-right mt-1">{error}</p>
      )}
    </div>
  );
}
