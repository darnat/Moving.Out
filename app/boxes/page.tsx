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
        <div className="flex items-center gap-2">
          <Link
            href="/boxes/packing"
            className="rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5"
            style={{ border: "1px solid var(--color-kraft)", color: "var(--color-pencil)" }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
            </svg>
            Pack
          </Link>
          <Link
            href="/boxes/new"
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-white"
            style={{ background: "var(--color-freight)" }}
          >
            + New
          </Link>
        </div>
      </div>
      <BoxesClient boxes={boxes} />
    </main>
  );
}
