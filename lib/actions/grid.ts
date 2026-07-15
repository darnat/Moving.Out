"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/actions/auth";
import { prisma } from "@/lib/prisma";

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

  // Cells the incoming box will occupy
  const newCols = Array.from({ length: widthCells }, (_, i) => gridCol + i);
  const newRows = Array.from({ length: depthCells }, (_, i) => gridRow + i);
  const newLevels = Array.from({ length: heightCells }, (_, i) => stackLevel + i);

  // Fetch all placed, non-retrieved boxes (excluding the one being moved)
  const placedBoxes = await prisma.box.findMany({
    where: { userId, id: { not: boxId }, retrieved: false, gridCol: { not: null } },
    include: { boxSize: true },
  });

  // Check whether any existing box's full footprint overlaps the new box's footprint
  const conflict = placedBoxes.find((existing) => {
    const { widthCells: ew, depthCells: ed, heightCells: eh } = existing.boxSize;
    const existingCols = Array.from({ length: ew }, (_, i) => existing.gridCol! + i);
    const existingRows = Array.from({ length: ed }, (_, i) => existing.gridRow! + i);
    const existingLevels = Array.from({ length: eh }, (_, i) => existing.stackLevel! + i);

    return (
      newCols.some((c) => existingCols.includes(c)) &&
      newRows.some((r) => existingRows.includes(r)) &&
      newLevels.some((l) => existingLevels.includes(l))
    );
  });

  if (conflict) return { error: `Cell occupied by ${conflict.labelNumber}` };

  // Include userId in the write to close the ownership TOCTOU gap
  await prisma.box.updateMany({
    where: { id: boxId, userId },
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
