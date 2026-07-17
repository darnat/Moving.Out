"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Room, BoxSize } from "@/app/generated/prisma/client";
import { createBox } from "@/lib/actions/boxes";
import { QrScanner } from "@/app/components/QrScanner";
import { haptic } from "@/lib/haptic";

type VoiceState = "idle" | "listening";

function Spinner() {
  return (
    <svg className="spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" opacity="0.9" />
      <path d="M12 2a10 10 0 0 0-10 10" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}

export function PackingClient({ rooms, boxSizes }: { rooms: Room[]; boxSizes: BoxSize[] }) {
  const router = useRouter();

  const [count, setCount]               = useState(0);
  const [label, setLabel]               = useState("");
  const [qrCode, setQrCode]             = useState<string | null>(null);
  const [selectedRoomId, setRoomId]     = useState(rooms[0]?.id ?? "");
  const [selectedSizeId, setSizeId]     = useState(boxSizes[0]?.id ?? "");
  const [items, setItems]               = useState<string[]>([]);
  const [itemInput, setItemInput]       = useState("");
  const [saving, setSaving]             = useState(false);
  const [showScanner, setShowScanner]   = useState(false);
  const [flash, setFlash]               = useState(false);
  const [voiceState, setVoiceState]     = useState<VoiceState>("idle");

  const labelRef = useRef<HTMLInputElement>(null);
  const itemRef  = useRef<HTMLInputElement>(null);

  /* Focus label on mount */
  useEffect(() => { labelRef.current?.focus(); }, []);

  /* Flash success briefly after saving */
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(false), 900);
    return () => clearTimeout(t);
  }, [flash]);

  function addItem(text?: string) {
    const val = (text ?? itemInput).trim();
    if (!val) return;
    setItems((prev) => [...prev, val]);
    setItemInput("");
    itemRef.current?.focus();
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function resetForNext() {
    setLabel("");
    setQrCode(null);
    setItems([]);
    setItemInput("");
    labelRef.current?.focus();
  }

  async function handleSave() {
    if (!label.trim() || !selectedRoomId || !selectedSizeId || saving) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set("labelNumber", label.trim());
      fd.set("roomId", selectedRoomId);
      fd.set("boxSizeId", selectedSizeId);
      fd.set("items", JSON.stringify(items));
      if (qrCode) fd.set("qrCode", qrCode);
      await createBox(fd);
      haptic("success");
      setCount((n) => n + 1);
      setFlash(true);
      resetForNext();
    } finally {
      setSaving(false);
    }
  }

  function handleScan(text: string) {
    setQrCode(text);
    setShowScanner(false);
    if (!label.trim()) setLabel(text.slice(0, 20));
    labelRef.current?.focus();
  }

  /* Web Speech API voice input for items */
  const startVoice = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    setVoiceState("listening");
    rec.onresult = (e: any) => {
      const transcript: string = e.results[0][0].transcript;
      const parsed = transcript.split(/,|\band\b/i).map((s: string) => s.trim()).filter(Boolean);
      setItems((prev) => [...prev, ...parsed]);
      haptic("light");
    };
    rec.onend = () => setVoiceState("idle");
    rec.onerror = () => setVoiceState("idle");
    rec.start();
  }, []);

  const canSave = label.trim() && selectedRoomId && selectedSizeId && !saving;

  return (
    <>
      {showScanner && (
        <QrScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}

      <div
        className="min-h-screen flex flex-col"
        style={{ background: "var(--color-paper)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 pt-safe pb-4 pt-4"
          style={{ borderBottom: "1px solid var(--color-kraft)" }}
        >
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm"
            style={{ color: "var(--color-pencil)" }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--color-pencil)" }}>
              Packing session
            </p>
          </div>

          <div
            className="rounded-lg px-2.5 py-1 text-sm font-bold label-number min-w-[2rem] text-center"
            style={{
              background: count > 0 ? "var(--color-freight-tint)" : "transparent",
              color: count > 0 ? "var(--color-freight)" : "var(--color-pencil)",
              border: `1px solid ${count > 0 ? "rgba(255,107,43,0.3)" : "var(--color-kraft)"}`,
              transition: "all 0.3s",
            }}
          >
            {count}
          </div>
        </div>

        {/* Flash overlay */}
        {flash && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            style={{ background: "rgba(255,107,43,0.12)" }}
          >
            <div
              className="rounded-3xl px-8 py-6 flex flex-col items-center gap-2"
              style={{ background: "var(--color-freight)", color: "#fff" }}
            >
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <span className="font-semibold text-lg">Saved!</span>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-7 pb-32">
          {/* Label */}
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-pencil)" }}>
              Label
            </label>
            <div className="flex gap-2">
              <input
                ref={labelRef}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && itemRef.current?.focus()}
                placeholder="BOX-001"
                className="label-number flex-1 rounded-xl px-4 py-3.5 text-base font-semibold"
                style={{ background: "var(--color-surface)", border: `1px solid ${qrCode ? "rgba(255,107,43,0.4)" : "var(--color-kraft)"}`, color: "var(--color-ink)" }}
              />
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="rounded-xl px-4 py-3.5 flex items-center justify-center"
                style={{ background: qrCode ? "var(--color-freight)" : "var(--color-surface)", border: "1px solid var(--color-kraft)", color: qrCode ? "#fff" : "var(--color-pencil)" }}
                title="Scan QR"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 18.75h.75v.75h-.75v-.75zM18.75 13.5h.75v.75h-.75v-.75zM18.75 18.75h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Room — large touch grid */}
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-pencil)" }}>
              Room
            </label>
            <div className="grid grid-cols-2 gap-2">
              {rooms.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRoomId(r.id)}
                  className="rounded-xl py-4 text-sm font-medium text-center transition-colors"
                  style={{
                    background: selectedRoomId === r.id ? "var(--color-freight)" : "var(--color-surface)",
                    border: selectedRoomId === r.id ? "1px solid var(--color-freight)" : "1px solid var(--color-kraft)",
                    color: selectedRoomId === r.id ? "#fff" : "var(--color-ink)",
                  }}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>

          {/* Box size */}
          {boxSizes.length > 1 && (
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-pencil)" }}>
                Size
              </label>
              <div className="grid grid-cols-3 gap-2">
                {boxSizes.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSizeId(s.id)}
                    className="rounded-xl py-3.5 text-sm font-medium text-center"
                    style={{
                      background: selectedSizeId === s.id ? "var(--color-surface)" : "transparent",
                      border: selectedSizeId === s.id ? "1px solid var(--color-freight)" : "1px solid var(--color-kraft)",
                      color: selectedSizeId === s.id ? "var(--color-freight)" : "var(--color-pencil)",
                    }}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Contents */}
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-pencil)" }}>
              Contents
            </label>

            {items.length > 0 && (
              <ul className="space-y-1 mb-2">
                {items.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm"
                    style={{ background: "var(--color-surface)", border: "1px solid var(--color-kraft)" }}
                  >
                    <span className="flex-1" style={{ color: "var(--color-ink)" }}>{item}</span>
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className="flex items-center justify-center w-8 h-8 rounded-lg text-lg shrink-0"
                      style={{ color: "var(--color-kraft)" }}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2">
              <input
                ref={itemRef}
                value={itemInput}
                onChange={(e) => setItemInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem())}
                placeholder="Type an item, press Enter…"
                className="flex-1 rounded-xl px-4 py-3.5 text-sm"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-kraft)", color: "var(--color-ink)" }}
              />
              {itemInput.trim() ? (
                <button
                  type="button"
                  onClick={() => addItem()}
                  className="rounded-xl px-4 py-3.5 text-sm font-medium"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-kraft)", color: "var(--color-ink)" }}
                >
                  Add
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startVoice}
                  className="rounded-xl px-4 py-3.5 flex items-center justify-center"
                  style={{
                    background: voiceState === "listening" ? "var(--color-freight)" : "var(--color-surface)",
                    border: "1px solid var(--color-kraft)",
                    color: voiceState === "listening" ? "#fff" : "var(--color-pencil)",
                  }}
                  title="Speak items"
                >
                  {voiceState === "listening" ? (
                    <svg className="spin w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                    </svg>
                  )}
                </button>
              )}
            </div>
            {voiceState === "listening" && (
              <p className="text-xs text-center" style={{ color: "var(--color-freight)" }}>
                Listening… say items separated by commas
              </p>
            )}
          </div>
        </div>

        {/* Sticky save button */}
        <div
          className="fixed bottom-0 inset-x-0 px-5 py-4"
          style={{ background: "rgba(6,6,8,0.9)", backdropFilter: "blur(20px)", borderTop: "1px solid var(--color-kraft)", paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
        >
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="w-full rounded-2xl py-4 text-base font-semibold text-white flex items-center justify-center gap-3 transition-opacity disabled:opacity-40"
            style={{ background: "var(--color-freight)" }}
          >
            {saving ? <><Spinner /> Saving…</> : "Save box"}
          </button>
        </div>
      </div>
    </>
  );
}
