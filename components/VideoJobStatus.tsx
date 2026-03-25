"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { VideoJobResponse } from "@/lib/types";

interface VideoJobStatusProps {
  jobId: string;
}

export default function VideoJobStatus({ jobId }: VideoJobStatusProps) {
  const [job, setJob] = useState<VideoJobResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/video-jobs/${jobId}`);
      if (!res.ok) {
        setError("Failed to fetch job status");
        return;
      }
      const data: VideoJobResponse = await res.json();
      setJob(data);

      // Stop polling when job is done
      if (data.status === "READY" || data.status === "FAILED") {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    } catch {
      setError("Network error");
    }
  }, [jobId]);

  useEffect(() => {
    fetchStatus();
    intervalRef.current = setInterval(fetchStatus, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchStatus]);

  const handleRetry = () => {
    setError(null);
    fetchStatus();
    intervalRef.current = setInterval(fetchStatus, 3000);
  };

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-xl border border-red-200">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-32" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-2xl border border-gray-200">
      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
        Video Generation
      </h3>

      {job.status === "PENDING" && (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
          </div>
          <p className="text-sm text-gray-600">Queued…</p>
        </div>
      )}

      {job.status === "PROCESSING" && (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm text-gray-600">Generating video…</p>
        </div>
      )}

      {job.status === "READY" && job.videoUrl && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-sm text-green-600 font-medium">Video ready!</p>
          </div>

          <video
            src={job.videoUrl}
            controls
            className="w-full rounded-xl border border-gray-200"
            id="video-player"
          >
            Your browser does not support the video tag.
          </video>

          <a
            href={job.videoUrl}
            download
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700
                       rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
            id="download-video-button"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download Video
          </a>
        </div>
      )}

      {job.status === "FAILED" && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-red-600 font-medium">Video generation failed</p>
              {job.error && (
                <p className="text-xs text-red-400 mt-1">{job.error}</p>
              )}
            </div>
          </div>

          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-medium
                       hover:bg-red-100 transition-colors"
            id="retry-video-button"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
