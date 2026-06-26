import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import { Scissors } from "lucide-react";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
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
          <header className="sticky top-0 z-50 w-full">
            <div className="mx-auto max-w-screen-md px-4 pt-4 pb-2">
              <div className="grid h-14 grid-cols-3 items-center rounded-3xl bg-white/90 dark:bg-indigo-900/80 px-5 shadow-[0_4px_24px_0_rgba(0,0,0,0.07)] dark:shadow-[0_4px_24px_0_rgba(0,0,0,0.3)] backdrop-blur-md transition-colors duration-300">

                {/* Right col (RTL: col-1 = right side) — scissors icon */}
                <div className="flex items-center justify-start">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-pink-500 shadow-md shadow-pink-200 dark:shadow-pink-900/40">
                    <Scissors size={16} className="text-white" strokeWidth={2} />
                  </div>
                </div>

                {/* Center col — brand name */}
                <div className="flex items-center justify-center">
                  <p className="text-lg font-black tracking-tight leading-none">
                    <span className="text-pink-500">Shaked</span>
                    <span className="text-slate-900 dark:text-white">ia</span>
                  </p>
                </div>

                {/* Left col (RTL: col-3 = left side) — dark mode toggle only */}
                <div className="flex items-center justify-end">
                  <ThemeToggle />
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
