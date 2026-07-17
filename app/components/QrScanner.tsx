"use client";

import { useEffect, useRef, useState } from "react";

export function QrScanner({
  onScan,
  onClose,
}: {
  onScan: (text: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | null = null;
    let intervalId: ReturnType<typeof setInterval>;
    let scanning = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (stopped || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setReady(true);

        const { readBarcodes } = await import("zxing-wasm/reader");

        intervalId = setInterval(async () => {
          if (stopped || scanning || !videoRef.current || !canvasRef.current) return;
          const video = videoRef.current;
          if (video.readyState < 2) return;
          scanning = true;
          try {
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d")!;
            ctx.drawImage(video, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const results = await readBarcodes(imageData, { formats: ["QRCode"] });
            if (results.length > 0 && !stopped) {
              stopped = true;
              clearInterval(intervalId);
              stream?.getTracks().forEach((t) => t.stop());
              const { haptic } = await import("@/lib/haptic");
              haptic("success");
              onScan(results[0].text);
            }
          } finally {
            scanning = false;
          }
        }, 300);
      } catch {
        if (!stopped) setError("Camera access denied");
      }
    }

    start();

    return () => {
      stopped = true;
      clearInterval(intervalId);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onScan]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: "rgba(0,0,0,0.88)" }}
    >
      <div className="relative w-full max-w-sm px-4 space-y-4">
        {error ? (
          <div className="text-center space-y-2 py-8">
            <svg className="w-10 h-10 mx-auto text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p className="text-white/70 text-sm">{error}</p>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-2xl bg-black aspect-square flex items-center justify-center">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              muted
              playsInline
            />
            {ready && (
              <div
                className="absolute w-52 h-52 rounded-xl pointer-events-none"
                style={{
                  border: "2px solid rgba(255,255,255,0.8)",
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
                }}
              />
            )}
            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
        {!error && (
          <p className="text-center text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
            Point at a QR code to scan
          </p>
        )}
        <button
          onClick={onClose}
          className="w-full rounded-xl px-4 py-3 text-sm font-medium"
          style={{
            border: "1px solid rgba(255,255,255,0.2)",
            color: "rgba(255,255,255,0.8)",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
