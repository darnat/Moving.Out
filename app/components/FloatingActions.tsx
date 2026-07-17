"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { QrScanner } from "./QrScanner";
import { findBoxSummaryByQrCode, setRetrieved } from "@/lib/actions/boxes";
import { haptic } from "@/lib/haptic";

type State =
  | "idle"
  | "scanning"     // camera open
  | "processing"   // fetching box data
  | "found"        // showing info drawer
  | "navigating";  // navigating to new-box form (no box found)

type BoxSummary = {
  id: string;
  labelNumber: string;
  retrieved: boolean;
  room: { name: string };
  items: string[];
  gridCol: number | null;
  gridRow: number | null;
  stackLevel: number | null;
};

function Spinner() {
  return (
    <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" opacity="0.9" />
      <path d="M12 2a10 10 0 0 0-10 10" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}

export function FloatingActions() {
  const [state, setState]           = useState<State>("idle");
  const [foundBox, setFoundBox]     = useState<BoxSummary | null>(null);
  const [retrieving, setRetrieving] = useState(false);
  const router   = useRouter();
  const pathname = usePathname();

  /* Drop the navigating overlay once the new page has rendered */
  useEffect(() => {
    setState((s) => (s === "navigating" ? "idle" : s));
  }, [pathname]);

  const handleScan = useCallback(async (text: string) => {
    setState("processing");
    const box = await findBoxSummaryByQrCode(text);
    if (box) {
      haptic("success");
      setFoundBox(box);
      setState("found");
    } else {
      /* No box registered for this QR — go to registration form */
      setState("navigating");
      router.push(`/boxes/new?qr=${encodeURIComponent(text)}`);
    }
  }, [router]);

  async function handleMarkRetrieved() {
    if (!foundBox || retrieving) return;
    setRetrieving(true);
    await setRetrieved(foundBox.id, true);
    haptic("success");
    setFoundBox((b) => b ? { ...b, retrieved: true } : b);
    setRetrieving(false);
  }

  function closeDrawer() {
    setState("idle");
    setFoundBox(null);
  }

  return (
    <>
      {/* Camera */}
      {state === "scanning" && (
        <QrScanner onScan={handleScan} onClose={() => setState("idle")} />
      )}

      {/* Processing overlay */}
      {(state === "processing" || state === "navigating") && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4"
          style={{ background: "rgba(0,0,0,0.88)" }}
        >
          <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
            {state === "navigating" ? "Opening form…" : "Looking up box…"}
          </p>
        </div>
      )}

      {/* Info drawer */}
      {state === "found" && foundBox && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={closeDrawer}
        >
          <div
            className="rounded-t-3xl p-6 space-y-5"
            style={{
              background: "rgb(18 18 20)",
              border: "1px solid rgba(255,255,255,0.1)",
              paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full mx-auto" style={{ background: "rgba(255,255,255,0.2)" }} />

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="label-number font-bold text-3xl" style={{ color: "var(--color-ink)" }}>
                  {foundBox.labelNumber}
                </span>
                {foundBox.retrieved && (
                  <span className="rounded-lg px-2.5 py-1 text-xs font-medium" style={{ background: "rgba(255,255,255,0.08)", color: "var(--color-pencil)" }}>
                    Retrieved
                  </span>
                )}
              </div>
              <p className="text-sm" style={{ color: "var(--color-pencil)" }}>{foundBox.room.name}</p>
              {foundBox.gridCol !== null && (
                <p className="text-xs" style={{ color: "var(--color-freight)" }}>
                  📍 Col {foundBox.gridCol} · Row {foundBox.gridRow} · Level {Math.round(foundBox.stackLevel!)}
                </p>
              )}
            </div>

            {foundBox.items.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-pencil)" }}>Contents</p>
                <div className="flex flex-wrap gap-1.5">
                  {foundBox.items.map((item, i) => (
                    <span
                      key={i}
                      className="rounded-lg px-2.5 py-1 text-sm"
                      style={{ background: "rgba(255,255,255,0.06)", color: "var(--color-ink)", border: "1px solid var(--color-kraft)" }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {!foundBox.retrieved && (
                <button
                  onClick={handleMarkRetrieved}
                  disabled={retrieving}
                  className="rounded-2xl py-4 text-sm font-medium flex items-center justify-center gap-2"
                  style={{ border: "1px solid var(--color-kraft)", color: "var(--color-ink)" }}
                >
                  {retrieving ? <Spinner /> : "✓"} Retrieved
                </button>
              )}
              <Link
                href={`/boxes/${foundBox.id}`}
                onClick={closeDrawer}
                className="rounded-2xl py-4 text-sm font-medium text-white flex items-center justify-center"
                style={{ background: "var(--color-freight)", gridColumn: foundBox.retrieved ? "1 / -1" : "auto" }}
              >
                Open details →
              </Link>
            </div>

            <button
              onClick={() => { setFoundBox(null); setState("scanning"); }}
              className="w-full text-sm py-2"
              style={{ color: "var(--color-pencil)" }}
            >
              Scan another box
            </button>
          </div>
        </div>
      )}

      {/* Single FAB */}
      <div
        className="fixed right-4 z-40 lg:right-6"
        style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom,0px) + 1rem)" }}
      >
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
