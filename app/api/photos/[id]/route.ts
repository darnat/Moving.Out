import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const photo = await prisma.photo.findFirst({
    where: { id, box: { userId: session.user.id } },
  });
  if (!photo) return new Response("Not found", { status: 404 });

  const upstream = await fetch(photo.url, {
    headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
  });
  if (!upstream.ok) return new Response("Blob unavailable", { status: 502 });

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "image/jpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
