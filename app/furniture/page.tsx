import { auth } from "@/lib/auth";
import { Nav } from "@/app/components/Nav";
import Link from "next/link";
import { getCachedFurnitureItems } from "@/lib/data";
import { FurnitureClient } from "./FurnitureClient";

export default async function FurniturePage() {
  const session = await auth();
  const userId = session!.user!.id!;
  const items = await getCachedFurnitureItems(userId);

  return (
    <div className="min-h-screen">
      <Nav active="furniture" />
      <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-semibold text-2xl" style={{ color: "var(--color-ink)" }}>
              Furniture
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--color-pencil)" }}>
              {items.length} item{items.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Link
            href="/furniture/new"
            className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium text-white"
            style={{ background: "var(--color-freight)" }}
          >
            <span className="text-base leading-none">+</span> Add
          </Link>
        </div>

        <FurnitureClient items={items} />
      </main>
    </div>
  );
}
