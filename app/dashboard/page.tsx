import { prisma } from "@/lib/db";
import Link from "next/link";
import DeleteListButton from "@/components/DeleteListButton";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const lists = await prisma.vocabList.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { items: true },
      },
    },
  });

  if (lists.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="bg-white rounded-2xl border border-gray-200 p-12 shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Welcome to Contly
            </h1>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              You haven&apos;t uploaded any vocabulary lists yet. Let&apos;s get
              started by uploading your first Excel file.
            </p>
            <Link
              href="/upload"
              className="inline-block px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Upload your first list
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Your Dashboard</h1>
          <Link
            href="/upload"
            className="px-4 py-2 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-100"
          >
            + New List
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lists.map((list) => {
            const dateStr = new Intl.DateTimeFormat("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }).format(list.createdAt);

            return (
              <div key={list.id} className="relative group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200">
                <DeleteListButton listId={list.id} />
                <Link
                  href={`/lists/${list.id}`}
                  className="block p-6"
                >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-semibold text-gray-900 line-clamp-2">
                    {list.name}
                  </h3>
                  <span className="text-xs font-medium px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full shrink-0">
                    {list._count.items} words
                  </span>
                </div>
                
                <div className="flex items-center text-sm text-gray-500 mt-6">
                  <svg className="w-4 h-4 mr-1.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {dateStr}
                </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
