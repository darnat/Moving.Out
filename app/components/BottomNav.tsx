"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  {
    href: "/",
    label: "Boxes",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
        <line strokeLinecap="round" x1="3.27" y1="6.96" x2="12" y2="12.01"/>
        <line strokeLinecap="round" x1="12" y1="22.08" x2="12" y2="12"/>
        <line strokeLinecap="round" x1="20.73" y1="6.96" x2="12" y2="12.01"/>
      </svg>
    ),
  },
  {
    href: "/furniture",
    label: "Furniture",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 11V8a3 3 0 013-3h8a3 3 0 013 3v3M3 13a2 2 0 012-2h.5M21 13a2 2 0 00-2-2h-.5M3 13v4h18v-4"/>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 17v1.5M19 17v1.5"/>
      </svg>
    ),
  },
  {
    href: "/grid",
    label: "Map",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <rect strokeLinecap="round" strokeLinejoin="round" x="3" y="3" width="7" height="7" rx="1.5"/>
        <rect strokeLinecap="round" strokeLinejoin="round" x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect strokeLinecap="round" strokeLinejoin="round" x="3" y="14" width="7" height="7" rx="1.5"/>
        <rect strokeLinecap="round" strokeLinejoin="round" x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/" || pathname.startsWith("/boxes");
return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden"
      style={{
        background: "rgba(6, 6, 8, 0.92)",
        backdropFilter: "blur(28px) saturate(180%)",
        WebkitBackdropFilter: "blur(28px) saturate(180%)",
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="flex items-stretch">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-3.5 transition-colors"
              style={{ color: active ? "var(--color-freight)" : "var(--color-pencil)" }}
            >
              {tab.icon}
              <span className="text-[10px] font-medium leading-none">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
