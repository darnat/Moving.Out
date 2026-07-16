"use server";

import { updateTag } from "next/cache";
import { userTag } from "@/lib/data";
import { requireUserId } from "@/lib/actions/auth";
import { prisma } from "@/lib/prisma";
import { BoxSize } from "@/app/generated/prisma/client";

// Tolerance: boxes may touch (share a boundary) but not overlap
const EPS = 0.0005;

// Physical dimensions in cells, using actual inches when available
function bw(bs: BoxSize) { return (bs.widthIn  || bs.widthCells  * 12) / 12; }
function bd(bs: BoxSize) { return (bs.depthIn  || bs.depthCells  * 12) / 12; }
function bh(bs: BoxSize) { return (bs.heightIn || bs.heightCells * 12) / 12; }

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

  const nw = bw(box.boxSize);
  const nd = bd(box.boxSize);
  const nh = bh(box.boxSize);

  const placedBoxes = await prisma.box.findMany({
    where: { userId, id: { not: boxId }, retrieved: false, gridCol: { not: null } },
    include: { boxSize: true },
  });

  const conflict = placedBoxes.find((b) => {
    const ew = bw(b.boxSize);
    const ed = bd(b.boxSize);
    const eh = bh(b.boxSize);

    // Axis-aligned interval overlap in col, row, and stack level
    const colOverlap   = gridCol    < b.gridCol!    + ew - EPS && gridCol    + nw > b.gridCol!    + EPS;
    const rowOverlap   = gridRow    < b.gridRow!    + ed - EPS && gridRow    + nd > b.gridRow!    + EPS;
    const levelOverlap = stackLevel < b.stackLevel! + eh - EPS && stackLevel + nh > b.stackLevel! + EPS;

    return colOverlap && rowOverlap && levelOverlap;
  });

  if (conflict) return { error: `Occupied by ${conflict.labelNumber}` };

  // Require support beneath any box not on the floor
  if (stackLevel > 1) {
    const hasSupport = placedBoxes.some((b) => {
      const ew = bw(b.boxSize); const ed = bd(b.boxSize);
      const colOk = gridCol < b.gridCol! + ew - EPS && gridCol + nw > b.gridCol! + EPS;
      const rowOk = gridRow < b.gridRow! + ed - EPS && gridRow + nd > b.gridRow! + EPS;
      return colOk && rowOk && Math.abs(b.stackLevel! + bh(b.boxSize) - stackLevel) < 0.01;
    });
    if (!hasSupport) return { error: "Nothing to stack on at that level" };
  }

  await prisma.box.updateMany({
    where: { id: boxId, userId },
    data: { gridCol, gridRow, stackLevel },
  });

  updateTag(userTag(userId));
  return {};
}

export async function unplaceBox(boxId: string): Promise<{ error?: string }> {
  const userId = await requireUserId();

  const box = await prisma.box.findFirst({
    where: { id: boxId, userId },
    include: { boxSize: true },
  });

  if (box?.gridCol != null && box.stackLevel != null) {
    const topLevel = box.stackLevel + bh(box.boxSize);
    const bwVal = bw(box.boxSize); const bdVal = bd(box.boxSize);

    const above = await prisma.box.findMany({
      where: { userId, retrieved: false, gridCol: { not: null },
               stackLevel: { gte: topLevel - 0.01, lte: topLevel + 0.01 }, id: { not: boxId } },
      include: { boxSize: true },
    });

    const stacked = above.filter(b => {
      const colOk = box.gridCol! < b.gridCol! + bw(b.boxSize) - EPS && box.gridCol! + bwVal > b.gridCol! + EPS;
      const rowOk = box.gridRow! < b.gridRow! + bd(b.boxSize) - EPS && box.gridRow! + bdVal > b.gridRow! + EPS;
      return colOk && rowOk;
    });

    if (stacked.length > 0) {
      const names = stacked.map(b => b.labelNumber).join(", ");
      return { error: `Remove ${names} first` };
    }
  }

  await prisma.box.updateMany({
    where: { id: boxId, userId },
    data: { gridCol: null, gridRow: null, stackLevel: null },
  });
  updateTag(userTag(userId));
  return {};
}
