"use server";

import { updateTag } from "next/cache";
import { userTag } from "@/lib/data";
import { requireUserId } from "@/lib/actions/auth";
import { prisma } from "@/lib/prisma";

export async function addBoxSize(formData: FormData) {
  const userId = await requireUserId();
  const widthIn  = Math.max(1, Number(formData.get("widthIn")));
  const depthIn  = Math.max(1, Number(formData.get("depthIn")));
  const heightIn = Math.max(1, Number(formData.get("heightIn")));
  await prisma.boxSize.create({
    data: {
      userId,
      name: formData.get("name") as string,
      widthIn,
      depthIn,
      heightIn,
      widthCells:  Math.max(1, Math.ceil(widthIn  / 12)),
      depthCells:  Math.max(1, Math.ceil(depthIn  / 12)),
      heightCells: Math.max(1, Math.ceil(heightIn / 12)),
    },
  });
  updateTag(userTag(userId));
}

export async function deleteBoxSize(id: string) {
  const userId = await requireUserId();
  await prisma.boxSize.deleteMany({ where: { id, userId } });
  updateTag(userTag(userId));
}

export async function addRoom(formData: FormData) {
  const userId = await requireUserId();
  await prisma.room.create({
    data: { userId, name: formData.get("name") as string },
  });
  updateTag(userTag(userId));
}

export async function deleteRoom(id: string) {
  const userId = await requireUserId();
  await prisma.room.deleteMany({ where: { id, userId } });
  updateTag(userTag(userId));
}

export async function updateStorageUnit(formData: FormData) {
  const userId = await requireUserId();
  const data = {
    widthCells:  Number(formData.get("widthCells")),
    depthCells:  Number(formData.get("depthCells")),
    heightCells: Number(formData.get("heightCells")),
  };
  await prisma.storageUnit.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
  updateTag(userTag(userId));
}
