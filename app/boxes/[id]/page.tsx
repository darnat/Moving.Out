import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { Nav } from "@/app/components/Nav";
import { BoxDetail } from "./BoxDetail";
import { getCachedBox, getCachedRooms } from "@/lib/data";

export default async function BoxPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user!.id!;

  const [box, rooms] = await Promise.all([
    getCachedBox(id, userId),
    getCachedRooms(userId),
  ]);

  if (!box) notFound();

  return (
    <div className="min-h-screen" style={{ background: "var(--color-paper)" }}>
      <Nav />
      <main className="mx-auto max-w-lg px-4 py-8">
        <BoxDetail box={box} rooms={rooms} />
      </main>
    </div>
  );
}
