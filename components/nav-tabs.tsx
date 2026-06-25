"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MapPin } from "lucide-react";

const tabs = [
  { href: "/",          label: "ערים",    Icon: MapPin          },
  { href: "/dashboard", label: "דשבורד",  Icon: LayoutDashboard },
];

export function NavTabs() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1 rounded-2xl bg-gray-100 dark:bg-indigo-800/60 p-1">
      {tabs.map(({ href, label, Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={[
              "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all duration-200",
              active
                ? "bg-white dark:bg-indigo-700 text-indigo-950 dark:text-white shadow-sm"
                : "text-slate-400 dark:text-indigo-300/60 hover:text-slate-600 dark:hover:text-indigo-200",
            ].join(" ")}
          >
            <Icon size={12} strokeWidth={2.5} />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
