"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import VocabRow from "./VocabRow";
import type { VocabItemResponse } from "@/lib/types";

interface VocabTableProps {
  items: VocabItemResponse[];
  onItemsChange: (items: VocabItemResponse[]) => void;
  onAudioStatusChange: (itemId: string, audioUrl: string) => void;
  onItemUpdate: (item: VocabItemResponse) => void;
  onItemDelete: (itemId: string) => void;
}

export default function VocabTable({ 
  items, 
  onItemsChange, 
  onAudioStatusChange,
  onItemUpdate,
  onItemDelete
}: VocabTableProps) {
  const [delay, setDelay] = useState(3);
  const [repeatCount, setRepeatCount] = useState(2);
  
  // Auto-play state
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  const handleAutoPlayComplete = useCallback(() => {
    if (!isAutoPlaying) return;

    setActiveRowIndex((current) => {
      if (current === null) return null;
      if (current >= items.length - 1) {
        setIsAutoPlaying(false);
        return null;
      }
      return current + 1;
    });
  }, [isAutoPlaying, items.length]);

  const toggleAutoPlay = () => {
    if (isAutoPlaying) {
      setIsAutoPlaying(false);
      setActiveRowIndex(null);
    } else {
      setIsAutoPlaying(true);
      setActiveRowIndex(0);
    }
  };

  // Scroll active row into view
  useEffect(() => {
    if (isAutoPlaying && activeRowIndex !== null && tableRef.current) {
      const rows = tableRef.current.querySelectorAll("tbody tr");
      const activeElement = rows[activeRowIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [activeRowIndex, isAutoPlaying]);

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No vocabulary items in this list.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Auto-play Controls */}
      <div className="p-5 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        <div className="flex gap-4 items-center">
          <button
            onClick={toggleAutoPlay}
            className={`
              flex items-center gap-2 px-5 py-2.5 font-medium rounded-xl transition-all duration-200
              ${isAutoPlaying 
                ? "bg-red-50 text-red-600 hover:bg-red-100 ring-2 ring-red-100 ring-offset-1" 
                : "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md"}
            `}
          >
            {isAutoPlaying ? (
              <>
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
                Stop Auto-Play
              </>
            ) : (
              <>
                <svg className="w-5 h-5 flex-shrink-0 pl-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5.14v14l11-7-11-7z" />
                </svg>
                Start Auto-Play
              </>
            )}
          </button>
          
          {isAutoPlaying && (
            <span className="text-sm font-medium text-indigo-600 animate-pulse hidden sm:inline-block">
              Playing {activeRowIndex !== null ? activeRowIndex + 1 : 0} of {items.length}...
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <DelayAndRepeatControl 
            label="Repeating" 
            value={repeatCount} 
            onChange={setRepeatCount} 
            min={1} 
            max={5} 
            suffix="x" 
          />
          <div className="w-px h-8 bg-gray-200 hidden sm:block" />
          <DelayAndRepeatControl 
            label="Wait gap" 
            value={delay} 
            onChange={setDelay} 
            min={1} 
            max={10} 
            suffix="s" 
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full" id="vocab-table" ref={tableRef}>
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">
                  #
                </th>
                <th
                  className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  dir="rtl"
                >
                  Arabic
                </th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  English
                </th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">
                  Audio
                </th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <VocabRow
                  key={item.id}
                  item={item}
                  delay={delay}
                  repeatCount={repeatCount}
                  isActive={isAutoPlaying && activeRowIndex === index}
                  onAudioStatusChange={onAudioStatusChange}
                  onAutoPlayComplete={handleAutoPlayComplete}
                  onItemUpdate={onItemUpdate}
                  onItemDelete={onItemDelete}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-sm text-gray-400 text-center">
        {items.length} {items.length === 1 ? "word" : "words"}
      </p>
    </div>
  );
}

// Inline helper component for numeric controls
function DelayAndRepeatControl({ 
  label, value, onChange, min, max, suffix 
}: { 
  label: string; value: number; onChange: (v: number) => void; min: number; max: number; suffix: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-gray-600 whitespace-nowrap">
        {label}
      </label>
      <div className="flex items-center">
        <button 
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-l-lg hover:bg-gray-50 text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          -
        </button>
        <div className="w-12 h-8 flex items-center justify-center border-y border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 font-mono">
          {value}{suffix}
        </div>
        <button 
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-r-lg hover:bg-gray-50 text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          +
        </button>
      </div>
    </div>
  );
}
