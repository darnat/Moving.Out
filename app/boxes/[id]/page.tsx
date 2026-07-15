import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Nav } from "@/app/components/Nav";
import { BoxDetail } from "./BoxDetail";

export default async function BoxPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user!.id!;

  const box = await prisma.box.findFirst({
    where: { id, userId },
    include: { room: true, boxSize: true, items: true, photos: true },
  });

  if (!box) notFound();

  return (
    <div className="min-h-screen" style={{ background: "var(--color-paper)" }}>
      <Nav />
      <main className="mx-auto max-w-lg px-4 py-8">
        <BoxDetail box={box} />
      </main>
    </div>
  );
}
