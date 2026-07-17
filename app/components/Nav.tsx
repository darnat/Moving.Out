import Link from "next/link";
import { auth } from "@/lib/auth";

export async function Nav({ active }: { active?: "search" | "grid" | "furniture" | "profile" }) {
  const session = await auth();
  const user = session?.user;

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "?";

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
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "var(--color-freight)" }} />
          Moving Out
        </Link>

        <nav className="flex items-center gap-1">
          {/* Desktop links */}
          <span className="hidden lg:contents">
            <NavLink href="/"          label="Boxes"     active={active === "search"} />
            <NavLink href="/furniture" label="Furniture" active={active === "furniture"} />
            <NavLink href="/grid"      label="Map"       active={active === "grid"} />
          </span>

          {/* New box CTA */}
          <Link
            href="/boxes/new"
            className="ml-2 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--color-freight)" }}
          >
            <span className="text-base leading-none">+</span>
            <span className="hidden sm:inline">New box</span>
          </Link>

          {/* Profile avatar */}
          <Link
            href="/profile"
            aria-label="Profile & settings"
            className="ml-1 flex items-center justify-center w-8 h-8 rounded-full overflow-hidden transition-opacity hover:opacity-80"
            style={{
              outline: active === "profile" ? "2px solid var(--color-freight)" : "none",
              outlineOffset: 2,
            }}
          >
            {user?.image ? (
              <img src={user.image} alt="" className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-xs font-semibold text-white"
                style={{ background: "var(--color-freight)" }}
              >
                {initials}
              </div>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, label, active }: { href: string; label: string; active?: boolean }) {
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
