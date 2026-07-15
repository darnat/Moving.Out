import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const [boxSizes, rooms, storageUnit] = await Promise.all([
    prisma.boxSize.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.room.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.storageUnit.findUnique({ where: { userId } }),
  ]);

  return (
    <main className="mx-auto max-w-lg px-4 py-8 space-y-8">
      <h1 className="text-xl font-bold text-gray-900">Settings</h1>
      <SettingsClient
        boxSizes={boxSizes}
        rooms={rooms}
        storageUnit={storageUnit ?? { widthCells: 10, depthCells: 20, id: "", userId }}
      />
    </main>
  );
}
