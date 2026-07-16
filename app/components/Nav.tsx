import Link from "next/link";

export function Nav({ active }: { active?: "search" | "grid" | "settings" | "furniture" }) {
  return (
    <header
      style={{
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        background: "rgba(6, 6, 8, 0.72)",
        backdropFilter: "blur(28px) saturate(180%)",
        WebkitBackdropFilter: "blur(28px) saturate(180%)",
      }}
      className="sticky top-0 z-10"
    >
      <div className="mx-auto max-w-3xl px-4 flex items-center justify-between h-14">
        <Link
          href="/"
          className="flex items-center gap-2 font-display font-semibold text-base tracking-tight"
          style={{ color: "var(--color-ink)" }}
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: "var(--color-freight)" }}
          />
          Moving Out
        </Link>

        <nav className="flex items-center gap-1">
          <NavLink href="/" label="Boxes" active={active === "search"} />
          <NavLink href="/grid" label="Map" active={active === "grid"} />
          <NavLink href="/furniture" label="Furniture" active={active === "furniture"} />
          <NavLink href="/settings" label="Settings" active={active === "settings"} />
          <Link
            href="/boxes/new"
            className="ml-2 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--color-freight)" }}
          >
            <span className="text-base leading-none">+</span> New box
          </Link>
        </nav>
      </div>
    </header>
  );
}

function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 text-sm transition-colors"
      style={{
        color: active ? "var(--color-ink)" : "var(--color-pencil)",
        fontWeight: active ? 600 : 400,
        background: active ? "var(--color-kraft)" : "transparent",
      }}
    >
      {label}
    </Link>
  );
}
