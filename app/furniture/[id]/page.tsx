import { auth } from "@/lib/auth";
import { Nav } from "@/app/components/Nav";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FurnitureDetail } from "./FurnitureDetail";

export default async function FurnitureItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user!.id!;

  const item = await prisma.furnitureItem.findFirst({ where: { id, userId } });
  if (!item) notFound();

  return (
    <div className="min-h-screen">
      <Nav active="furniture" />
      <main className="mx-auto max-w-lg px-4 py-8">
        <FurnitureDetail item={item} />
      </main>
    </div>
  );
}
