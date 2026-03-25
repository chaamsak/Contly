"use client";

interface UploadSummaryProps {
  name: string;
  itemCount: number;
  totalRows: number;
  skippedRows: number;
  dupeRows: number;
}

export default function UploadSummary({
  name,
  itemCount,
  totalRows,
  skippedRows,
  dupeRows,
}: UploadSummaryProps) {
  return (
    <div className="w-full max-w-xl mx-auto p-6 bg-white rounded-2xl border border-gray-200">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
          <svg
            className="w-5 h-5 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Upload Complete</h2>
          <p className="text-sm text-gray-500">{name}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-indigo-50 rounded-xl">
          <p className="text-2xl font-bold text-indigo-600">{itemCount}</p>
          <p className="text-sm text-indigo-600/70">Words imported</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-xl">
          <p className="text-2xl font-bold text-gray-700">{totalRows}</p>
          <p className="text-sm text-gray-500">Total rows</p>
        </div>
        {skippedRows > 0 && (
          <div className="p-4 bg-amber-50 rounded-xl">
            <p className="text-2xl font-bold text-amber-600">{skippedRows}</p>
            <p className="text-sm text-amber-600/70">Skipped</p>
          </div>
        )}
        {dupeRows > 0 && (
          <div className="p-4 bg-orange-50 rounded-xl">
            <p className="text-2xl font-bold text-orange-600">{dupeRows}</p>
            <p className="text-sm text-orange-600/70">Duplicates</p>
          </div>
        )}
      </div>
    </div>
  );
}
