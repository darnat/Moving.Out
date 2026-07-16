import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { issueSignedToken, presignUrl } from "@vercel/blob";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const photo = await prisma.photo.findFirst({
    where: { id, box: { userId: session.user.id } },
  });
  if (!photo) return new Response("Not found", { status: 404 });

  // pathname = everything after the host (e.g. "photo-abc123.jpg")
  const pathname = new URL(photo.url).pathname.slice(1);

  const signedToken = await issueSignedToken({
    operations: ["get"],
    pathname,
    validUntil: Date.now() + 60 * 60 * 1000, // 1 hour
  });

  const { presignedUrl } = await presignUrl(signedToken, {
    operation: "get",
    pathname,
    access: "private",
  });

  return Response.redirect(presignedUrl, 302);
}
