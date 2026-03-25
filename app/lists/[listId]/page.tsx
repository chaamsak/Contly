"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import VocabTable from "@/components/VocabTable";
import UploadSummary from "@/components/UploadSummary";
import GenerateVideoButton from "@/components/GenerateVideoButton";
import VideoJobStatus from "@/components/VideoJobStatus";
import type { VocabListResponse, VocabItemResponse, VideoJobResponse } from "@/lib/types";

export default function ListPage() {
  const params = useParams();
  const listId = params.listId as string;

  const [list, setList] = useState<VocabListResponse | null>(null);
  const [items, setItems] = useState<VocabItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<VideoJobResponse | null>(null);

  useEffect(() => {
    async function fetchList() {
      try {
        const res = await fetch(`/api/lists/${listId}`);
        if (!res.ok) {
          setError("Failed to load vocabulary list");
          return;
        }
        const data: VocabListResponse = await res.json();
        setList(data);
        setItems(data.items);
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchList();
  }, [listId]);

  const handleItemsChange = useCallback((updatedItems: VocabItemResponse[]) => {
    setItems(updatedItems);
  }, []);

  const handleAudioStatusChange = useCallback(
    (itemId: string, audioUrl: string) => {
      setItems((prev) => 
        prev.map((item) =>
          item.id === itemId
            ? { ...item, audioUrl, audioStatus: "READY" as const }
            : item
        )
      );
    },
    []
  );

  const handleItemUpdate = useCallback((updatedItem: VocabItemResponse) => {
    setItems((prev) => 
      prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    );
  }, []);

  const handleItemDelete = useCallback((deletedId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== deletedId));
  }, []);

  const handleJobCreated = useCallback((job: VideoJobResponse) => {
    setActiveJob(job);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading vocabulary…</p>
        </div>
      </div>
    );
  }

  if (error || !list) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "List not found"}</p>
          <a
            href="/upload"
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            ← Upload a new list
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <a
              href="/upload"
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium mb-2 inline-block"
            >
              ← Upload
            </a>
            <h1 className="text-2xl font-bold text-gray-900">{list.name}</h1>
          </div>
          <GenerateVideoButton
            listId={listId}
            items={items}
            onJobCreated={handleJobCreated}
            onAudioStatusChange={handleAudioStatusChange}
          />
        </div>

        {/* Upload stats */}
        <div className="mb-8">
          <UploadSummary
            name={list.name}
            itemCount={items.length}
            totalRows={list.totalRows}
            skippedRows={list.skippedRows}
            dupeRows={list.dupeRows}
          />
        </div>

        {/* Active video job */}
        {activeJob && (
          <div className="mb-8">
            <VideoJobStatus jobId={activeJob.id} />
          </div>
        )}

        {/* Vocabulary table */}
        <VocabTable 
          items={items} 
          onItemsChange={handleItemsChange} 
          onAudioStatusChange={handleAudioStatusChange}
          onItemUpdate={handleItemUpdate}
          onItemDelete={handleItemDelete}
        />
      </div>
    </div>
  );
}
