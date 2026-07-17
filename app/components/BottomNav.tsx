"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { QrScanner } from "./QrScanner";
import { findBoxByQrCode } from "@/lib/actions/boxes";

const navTabs = [
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
  const router = useRouter();
  const [showScanner, setShowScanner] = useState(false);

  function isActive(href: string) {
    if (href === "/") return pathname === "/" || pathname.startsWith("/boxes");
    return pathname === href || pathname.startsWith(href + "/");
  }

  const handleScan = useCallback(async (text: string) => {
    setShowScanner(false);
    const boxId = await findBoxByQrCode(text);
    if (boxId) {
      router.push(`/boxes/${boxId}`);
    } else {
      router.push(`/boxes/new?qr=${encodeURIComponent(text)}`);
    }
  }, [router]);

  return (
    <>
      {showScanner && (
        <QrScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}

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
          {navTabs.map((tab) => {
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

          {/* QR scan — replaces Settings */}
          <button
            onClick={() => setShowScanner(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-3.5 transition-colors"
            style={{ color: "var(--color-pencil)" }}
            aria-label="Scan QR code"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 18.75h.75v.75h-.75v-.75zM18.75 13.5h.75v.75h-.75v-.75zM18.75 18.75h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
            </svg>
            <span className="text-[10px] font-medium leading-none">Scan</span>
          </button>
        </div>
      </nav>
    </>
  );
}
