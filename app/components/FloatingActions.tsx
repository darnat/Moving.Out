"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { QrScanner } from "./QrScanner";
import { findBoxByQrCode } from "@/lib/actions/boxes";

type ScanState = "idle" | "scanning" | "processing";

export function FloatingActions() {
  const [state, setState] = useState<ScanState>("idle");
  const router = useRouter();
  const pathname = usePathname();

  /* pathname changes only after the new page has rendered — safe to drop the overlay */
  useEffect(() => {
    setState((s) => (s === "processing" ? "idle" : s));
  }, [pathname]);

  const handleScan = useCallback(async (text: string) => {
    setState("processing");
    const boxId = await findBoxByQrCode(text);
    if (boxId) {
      router.push(`/boxes/${boxId}`);
    } else {
      router.push(`/boxes/new?qr=${encodeURIComponent(text)}`);
    }
  }, [router]);

  return (
    <>
      {state === "scanning" && (
        <QrScanner onScan={handleScan} onClose={() => setState("idle")} />
      )}

      {state === "processing" && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4"
          style={{ background: "rgba(0,0,0,0.88)" }}
        >
          <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
            Looking up box…
          </p>
        </div>
      )}

      <div className="fixed right-4 z-50 lg:right-6 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px)+1rem)] lg:bottom-6">
        <button
          onClick={() => setState("scanning")}
          aria-label="Scan QR code"
          className="w-14 h-14 rounded-full flex items-center justify-center text-white transition-transform duration-200 active:scale-95"
          style={{
            background: "var(--color-freight)",
            boxShadow: "0 4px 32px rgba(255,107,43,0.55), inset 0 1px 0 rgba(255,255,255,0.25)",
          }}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 18.75h.75v.75h-.75v-.75zM18.75 13.5h.75v.75h-.75v-.75zM18.75 18.75h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
          </svg>
        </button>
      </div>
    </>
  );
}
