import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewBoxForm } from "./NewBoxForm";

export default async function NewBoxPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const [rooms, boxSizes] = await Promise.all([
    prisma.room.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.boxSize.findMany({ where: { userId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 text-xl font-bold text-gray-900">Register New Box</h1>
      <NewBoxForm rooms={rooms} boxSizes={boxSizes} />
    </main>
  );
}
