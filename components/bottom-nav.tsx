"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, Building2, CalendarDays, Settings } from "lucide-react";

type TabId = "home" | "cities" | "calendar" | "settings";

const NAV_ITEMS: { id: TabId; label: string; Icon: React.ElementType; href: string }[] = [
  { id: "home",     label: "בית",    Icon: Home,        href: "/" },
  { id: "cities",   label: "ערים",   Icon: Building2,   href: "/cities" },
  { id: "calendar", label: "יומן",   Icon: CalendarDays, href: "/calendar" },
  { id: "settings", label: "הגדרות", Icon: Settings,    href: "/settings" },
];

function getActive(pathname: string): TabId {
  if (pathname.startsWith("/cities") || pathname.startsWith("/salons")) return "cities";
  if (pathname.startsWith("/calendar")) return "calendar";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname === "/" || pathname.startsWith("/dashboard")) return "home";
  return "home";
}

export function BottomNav() {
  const pathname   = usePathname();
  const router     = useRouter();
  const activeTab  = getActive(pathname);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-screen-md">
        <nav className="relative flex h-16 items-stretch border-t border-gray-100 dark:border-indigo-800/50 bg-white/95 dark:bg-indigo-900/95 backdrop-blur-md">
          {NAV_ITEMS.map(({ id, label, Icon, href }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => router.push(href)}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors ${
                  active
                    ? "text-pink-500"
                    : "text-slate-400 dark:text-indigo-500 hover:text-slate-600 dark:hover:text-indigo-300"
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                <span className="text-[10px] font-semibold">{label}</span>
                {active && (
                  <div className="absolute bottom-1.5 h-1 w-1 rounded-full bg-pink-500" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
