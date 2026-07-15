"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function placeBox(
  boxId: string,
  gridCol: number,
  gridRow: number,
  stackLevel: number
): Promise<{ error?: string }> {
  const userId = await requireUserId();

  const box = await prisma.box.findFirst({
    where: { id: boxId, userId },
    include: { boxSize: true },
  });
  if (!box) return { error: "Box not found" };

  const { widthCells, depthCells, heightCells } = box.boxSize;
  const colsOccupied = Array.from({ length: widthCells }, (_, i) => gridCol + i);
  const rowsOccupied = Array.from({ length: depthCells }, (_, i) => gridRow + i);
  const levelsOccupied = Array.from({ length: heightCells }, (_, i) => stackLevel + i);

  const conflict = await prisma.box.findFirst({
    where: {
      userId,
      id: { not: boxId },
      retrieved: false,
      gridCol: { in: colsOccupied },
      gridRow: { in: rowsOccupied },
      stackLevel: { in: levelsOccupied },
    },
  });

  if (conflict) return { error: `Cell occupied by ${conflict.labelNumber}` };

  await prisma.box.update({
    where: { id: boxId },
    data: { gridCol, gridRow, stackLevel },
  });

  revalidatePath("/grid");
  revalidatePath("/");
  return {};
}

export async function unplaceBox(boxId: string) {
  const userId = await requireUserId();
  await prisma.box.updateMany({
    where: { id: boxId, userId },
    data: { gridCol: null, gridRow: null, stackLevel: null },
  });
  revalidatePath("/grid");
  revalidatePath("/");
}
