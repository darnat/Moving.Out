"use client";

import { useState, useEffect, useCallback } from "react";

export function PhotoGallery({
  urls,
  initialIndex,
  onClose,
}: {
  urls: string[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(initialIndex);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const prev = useCallback(
    () => setIdx((i) => (i - 1 + urls.length) % urls.length),
    [urls.length],
  );
  const next = useCallback(
    () => setIdx((i) => (i + 1) % urls.length),
    [urls.length],
  );

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, prev, next]);

  const navBtn: React.CSSProperties = {
    width: 44,
    height: 44,
    borderRadius: 22,
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.18)",
    color: "#fff",
    fontSize: 22,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.94)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: "52px 16px 48px",
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchStartX === null) return;
          const dx = e.changedTouches[0].clientX - touchStartX;
          if (Math.abs(dx) > 48) dx < 0 ? next() : prev();
          setTouchStartX(null);
        }}
      >
        {urls.length > 1 && (
          <button onClick={prev} style={navBtn}>‹</button>
        )}

        <img
          src={urls[idx]}
          alt=""
          style={{
            flex: 1,
            minWidth: 0,
            maxHeight: "100%",
            objectFit: "contain",
            borderRadius: 12,
          }}
        />

        {urls.length > 1 && (
          <button onClick={next} style={navBtn}>›</button>
        )}
      </div>

      {urls.length > 1 && (
        <div
          style={{
            position: "absolute",
            bottom: 18,
            left: "50%",
            transform: "translateX(-50%)",
            color: "rgba(255,255,255,0.55)",
            fontSize: 13,
            pointerEvents: "none",
          }}
        >
          {idx + 1} / {urls.length}
        </div>
      )}

      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          width: 36,
          height: 36,
          borderRadius: 18,
          background: "rgba(255,255,255,0.12)",
          border: "1px solid rgba(255,255,255,0.18)",
          color: "#fff",
          fontSize: 18,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        ×
      </button>
    </div>
  );
}
