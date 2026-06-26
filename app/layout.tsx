import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { NavTabs } from "@/components/nav-tabs";
import "./globals.css";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "shkedia",
  description: "ניהול סלונים ולקוחות",
  manifest: "/manifest.json",
  themeColor: "#ec4899",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "shkedia",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${heebo.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-[family-name:var(--font-heebo)] bg-gray-50 dark:bg-indigo-950 transition-colors duration-300">
        <ThemeProvider>
          {/* Header */}
          <header className="sticky top-0 z-50 w-full">
            <div className="mx-auto max-w-screen-md px-4 pt-4 pb-2">
              <div className="flex h-14 items-center justify-between rounded-3xl bg-white/90 dark:bg-indigo-900/80 px-5 shadow-[0_4px_24px_0_rgba(0,0,0,0.07)] dark:shadow-[0_4px_24px_0_rgba(0,0,0,0.3)] backdrop-blur-md transition-colors duration-300">

                {/* Brand */}
                <div className="flex items-center gap-3">
                  {/* Pink dot logo mark */}
                  <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-pink-500 shadow-md shadow-pink-200 dark:shadow-pink-900/40">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="4.5" cy="4.5" r="2.5" fill="white" />
                      <circle cx="9.5" cy="9.5" r="2.5" fill="white" opacity=".55" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-black tracking-tight text-indigo-950 dark:text-white leading-none">
                      shkedia
                    </p>
                    <p className="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-indigo-300/60 leading-none">
                      גוש דן
                    </p>
                  </div>
                </div>

                {/* Nav + Actions */}
                <div className="flex items-center gap-2">
                  <NavTabs />
                  <ThemeToggle />
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-100 dark:bg-pink-900/40 text-xs font-bold text-pink-600 dark:text-pink-300">
                    נ
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 mx-auto w-full max-w-screen-md px-4 py-5 pb-12">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
