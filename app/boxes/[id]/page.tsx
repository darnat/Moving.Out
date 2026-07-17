import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { Nav } from "@/app/components/Nav";
import { BoxDetail } from "./BoxDetail";
import { getCachedBox, getCachedRooms } from "@/lib/data";
import { issueSignedToken, presignUrl } from "@vercel/blob";

/* Generate a fresh 1-hour presigned URL for a private blob.
   Done outside the data cache so URLs never go stale. */
async function presignPhoto(blobUrl: string): Promise<string> {
  const pathname = new URL(blobUrl).pathname.slice(1);
  const token = await issueSignedToken({
    operations: ["get"],
    pathname,
    validUntil: Date.now() + 60 * 60 * 1000,
  });
  const { presignedUrl } = await presignUrl(token, { operation: "get", pathname, access: "private" });
  return presignedUrl;
}

export default async function BoxPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user!.id!;

  const [box, rooms] = await Promise.all([
    getCachedBox(id, userId),
    getCachedRooms(userId),
  ]);

  if (!box) notFound();

  /* Presign all photos in parallel — fresh on every render, not cached */
  const photoUrls: Record<string, string> = {};
  await Promise.all(
    box.photos.map(async (photo) => {
      photoUrls[photo.id] = await presignPhoto(photo.url);
    }),
  );

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-lg px-4 py-8">
        <BoxDetail box={box} rooms={rooms} photoUrls={photoUrls} />
      </main>
    </div>
  );
}
