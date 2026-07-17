export default function Loading() {
  return (
    <div className="mx-auto max-w-lg px-4 py-8 space-y-4 animate-pulse">
      <div className="h-28 rounded-3xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-kraft)" }} />
      <div className="h-10 rounded-2xl w-1/2" style={{ background: "var(--color-surface)", border: "1px solid var(--color-kraft)" }} />
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-12 rounded-2xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-kraft)", opacity: 1 - i * 0.2 }} />
      ))}
    </div>
  );
}
