"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QrScanner } from "./QrScanner";
import { findBoxByQrCode } from "@/lib/actions/boxes";

export function FloatingActions() {
  const [open, setOpen]           = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [qrError, setQrError]     = useState<string | null>(null);
  const router = useRouter();

  const handleQrScan = useCallback(async (text: string) => {
    setShowScanner(false);
    setQrError(null);
    const boxId = await findBoxByQrCode(text);
    if (boxId) {
      router.push(`/boxes/${boxId}`);
    } else {
      setQrError("QR code not registered to any box");
    }
  }, [router]);

  function openScanner() {
    setOpen(false);
    setQrError(null);
    setShowScanner(true);
  }

  return (
    <>
      {showScanner && (
        <QrScanner onScan={handleQrScan} onClose={() => setShowScanner(false)} />
      )}

      {/* Tap-outside backdrop */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}

      <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-3 lg:bottom-6 lg:right-6">
        {/* Action items — slide up when open */}
        <div
          className="flex flex-col items-end gap-2 transition-all duration-200 origin-bottom"
          style={{
            opacity: open ? 1 : 0,
            transform: open ? "translateY(0) scale(1)" : "translateY(8px) scale(0.96)",
            pointerEvents: open ? "auto" : "none",
          }}
        >
          {/* Scan QR */}
          <ActionItem
            label="Scan QR code"
            onClick={openScanner}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 18.75h.75v.75h-.75v-.75zM18.75 13.5h.75v.75h-.75v-.75zM18.75 18.75h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
              </svg>
            }
          />

          {/* New box */}
          <ActionItem
            label="Add a box"
            href="/boxes/new"
            onClick={() => setOpen(false)}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 12h4M12 10v4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            }
          />
        </div>

        {/* QR error pill */}
        {qrError && (
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium shadow"
            style={{
              background: "var(--color-freight-tint)",
              border: "1px solid color-mix(in srgb, var(--color-freight) 30%, transparent)",
              color: "var(--color-freight)",
            }}
          >
            {qrError}
            <button onClick={() => setQrError(null)} style={{ color: "var(--color-freight)", opacity: 0.6 }}>✕</button>
          </div>
        )}

        {/* Main FAB */}
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close actions" : "Quick actions"}
          className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-transform duration-200 active:scale-95"
          style={{
            background: "var(--color-freight)",
            boxShadow: "0 4px 32px rgba(255,107,43,0.55), inset 0 1px 0 rgba(255,255,255,0.25)",
            transform: open ? "rotate(45deg)" : "rotate(0deg)",
          }}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>
    </>
  );
}

function ActionItem({
  label,
  icon,
  href,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
}) {
  const cls =
    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium glass active:scale-95 transition-transform";
  const style = {
    background: "var(--color-surface)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "var(--color-ink)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.09), 0 16px 40px rgba(0,0,0,0.6)",
  };

  if (href) {
    return (
      <Link href={href} onClick={onClick} className={cls} style={style}>
        <span style={{ color: "var(--color-freight)" }}>{icon}</span>
        {label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls} style={style}>
      <span style={{ color: "var(--color-freight)" }}>{icon}</span>
      {label}
    </button>
  );
}
