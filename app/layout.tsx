import type { Metadata } from "next";
import { DM_Sans, Noto_Naskh_Arabic } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const notoNaskhArabic = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  variable: "--font-noto-naskh-arabic",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Contly — Arabic Vocabulary Builder",
  description:
    "Upload Arabic vocabulary lists, generate audio pronunciations, and create video flashcards.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${dmSans.variable} ${notoNaskhArabic.variable}`} suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-gray-50 text-gray-900" suppressHydrationWarning>
        {/* Top nav */}
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200/60">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-lg
                            flex items-center justify-center shadow-sm
                            group-hover:shadow-md transition-shadow duration-200">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <span className="font-bold text-lg text-gray-900 tracking-tight">
                Contly
              </span>
            </a>
            <div className="flex items-center gap-6">
              <a href="/dashboard" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                Dashboard
              </a>
              <a
                href="/upload"
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg
                         hover:bg-indigo-700 transition-colors duration-200
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                id="nav-upload-button"
              >
                Upload List
              </a>
            </div>
          </div>
        </nav>

        <main>{children}</main>
      </body>
    </html>
  );
}
