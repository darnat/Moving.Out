"use server";

import { updateTag } from "next/cache";
import { userTag } from "@/lib/data";
import { requireUserId } from "@/lib/actions/auth";
import { prisma } from "@/lib/prisma";

export async function addFurnitureItem(formData: FormData) {
  const userId = await requireUserId();
  await prisma.furnitureItem.create({
    data: {
      userId,
      name:      formData.get("name")      as string,
      groupName: (formData.get("groupName") as string) || null,
      color:     (formData.get("color")     as string) || "#7B95AE",
      widthIn:   Math.max(1, Number(formData.get("widthIn"))),
      depthIn:   Math.max(1, Number(formData.get("depthIn"))),
      heightIn:  Math.max(1, Number(formData.get("heightIn"))),
    },
  });
  updateTag(userTag(userId));
}

export async function updateFurnitureItem(id: string, data: {
  name?: string;
  groupName?: string | null;
  color?: string;
  widthIn?: number;
  depthIn?: number;
  heightIn?: number;
}) {
  const userId = await requireUserId();
  await prisma.furnitureItem.updateMany({ where: { id, userId }, data });
  updateTag(userTag(userId));
}

export async function deleteFurnitureItem(id: string) {
  const userId = await requireUserId();
  await prisma.furnitureItem.deleteMany({ where: { id, userId } });
  updateTag(userTag(userId));
}

export async function placeFurnitureItem(
  id: string,
  gridCol: number,
  gridRow: number,
  stackLevel: number,
): Promise<{ error?: string }> {
  const userId = await requireUserId();
  const item = await prisma.furnitureItem.findFirst({ where: { id, userId } });
  if (!item) return { error: "Item not found" };
  await prisma.furnitureItem.updateMany({
    where: { id, userId },
    data: { gridCol, gridRow, stackLevel },
  });
  updateTag(userTag(userId));
  return {};
}

export async function unplaceFurnitureItem(id: string): Promise<{ error?: string }> {
  const userId = await requireUserId();
  await prisma.furnitureItem.updateMany({
    where: { id, userId },
    data: { gridCol: null, gridRow: null, stackLevel: null },
  });
  updateTag(userTag(userId));
  return {};
}
