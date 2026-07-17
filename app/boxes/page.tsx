import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { BoxesClient } from "./BoxesClient";

export default async function BoxesPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const boxes = await prisma.box.findMany({
    where: { userId },
    include: { room: true, boxSize: true },
    orderBy: { labelNumber: "asc" },
  });

  return (
    <main className="mx-auto max-w-lg px-4 py-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: "var(--color-ink)" }}>All Boxes</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/boxes/new"
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-white"
            style={{ background: "var(--color-freight)" }}
          >
            + New
          </Link>
          <Link href="/" className="text-sm" style={{ color: "var(--color-pencil)" }}>← Dashboard</Link>
        </div>
      </div>
      <BoxesClient boxes={boxes} />
    </main>
  );
}
