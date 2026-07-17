export default function Loading() {
  return (
    <div className="mx-auto max-w-lg px-4 py-8 space-y-3 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="h-16 rounded-2xl"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-kraft)", opacity: 1 - i * 0.15 }}
        />
      ))}
    </div>
  );
}
