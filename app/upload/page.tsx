"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import UploadForm from "@/components/UploadForm";
import UploadSummary from "@/components/UploadSummary";
import type { UploadResponse } from "@/lib/types";

export default function UploadPage() {
  const router = useRouter();
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);

  const handleUploadComplete = (data: UploadResponse) => {
    setUploadResult(data);
  };

  const handleViewList = () => {
    if (uploadResult) {
      router.push(`/lists/${uploadResult.listId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Upload Vocabulary
          </h1>
          <p className="mt-3 text-gray-500 text-lg">
            Upload an Excel or CSV file with Arabic vocabulary to get started
          </p>
        </div>

        {!uploadResult ? (
          <UploadForm onUploadComplete={handleUploadComplete} />
        ) : (
          <div className="space-y-6">
            <UploadSummary
              name={uploadResult.name}
              itemCount={uploadResult.itemCount}
              totalRows={uploadResult.totalRows}
              skippedRows={uploadResult.skippedRows}
              dupeRows={uploadResult.dupeRows}
            />

            <div className="flex justify-center gap-4">
              <button
                onClick={handleViewList}
                className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl
                         hover:bg-indigo-700 transition-colors duration-200
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                id="view-list-button"
              >
                View Vocabulary List
              </button>
              <button
                onClick={() => setUploadResult(null)}
                className="px-6 py-3 bg-white text-gray-700 font-medium rounded-xl
                         border border-gray-300 hover:bg-gray-50
                         transition-colors duration-200
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                id="upload-another-button"
              >
                Upload Another
              </button>
            </div>
          </div>
        )}

        {/* Help section */}
        <div className="mt-16 p-6 bg-white rounded-2xl border border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
            File Format
          </h2>
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              Your file should have columns for <strong>Arabic</strong> and{" "}
              <strong>English</strong> words.
            </p>
            <p>
              Headers are auto-detected. If not found, column A is treated as
              Arabic and column B as English.
            </p>
            <p>
              Arabic cells with multiple forms (separated by / or \) will use
              the first form as the primary word.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
