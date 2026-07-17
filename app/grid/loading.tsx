export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 animate-pulse">
      <div className="mb-6 space-y-2">
        <div className="h-7 w-40 rounded-lg" style={{ background: "var(--color-surface)" }} />
        <div className="h-4 w-24 rounded" style={{ background: "var(--color-surface)" }} />
      </div>
      <div
        className="w-full rounded-2xl"
        style={{ height: "min(76vh, 660px)", background: "var(--color-surface)", border: "1px solid var(--color-kraft)" }}
      />
    </div>
  );
}
