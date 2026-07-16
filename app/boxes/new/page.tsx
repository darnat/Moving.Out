import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Nav } from "@/app/components/Nav";
import { NewBoxForm } from "./NewBoxForm";

export default async function NewBoxPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const [rooms, boxSizes] = await Promise.all([
    prisma.room.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.boxSize.findMany({ where: { userId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="font-display font-semibold text-2xl mb-6" style={{ color: "var(--color-ink)" }}>
          Register a box
        </h1>
        <NewBoxForm rooms={rooms} boxSizes={boxSizes} />
      </main>
    </div>
  );
}
