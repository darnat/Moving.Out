import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PackingClient } from "./PackingClient";

export default async function PackingPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const [rooms, boxSizes] = await Promise.all([
    prisma.room.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.boxSize.findMany({ where: { userId }, orderBy: { name: "asc" } }),
  ]);

  return <PackingClient rooms={rooms} boxSizes={boxSizes} />;
}
