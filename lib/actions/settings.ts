"use server";

import { revalidatePath } from "next/cache";
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
  revalidatePath("/settings");
}

export async function deleteBoxSize(id: string) {
  const userId = await requireUserId();
  await prisma.boxSize.deleteMany({ where: { id, userId } });
  revalidatePath("/settings");
}

export async function addRoom(formData: FormData) {
  const userId = await requireUserId();
  await prisma.room.create({
    data: { userId, name: formData.get("name") as string },
  });
  revalidatePath("/settings");
}

export async function deleteRoom(id: string) {
  const userId = await requireUserId();
  await prisma.room.deleteMany({ where: { id, userId } });
  revalidatePath("/settings");
}

export async function updateStorageUnit(formData: FormData) {
  const userId = await requireUserId();
  await prisma.storageUnit.upsert({
    where: { userId },
    update: {
      widthCells: Number(formData.get("widthCells")),
      depthCells: Number(formData.get("depthCells")),
    },
    create: {
      userId,
      widthCells: Number(formData.get("widthCells")),
      depthCells: Number(formData.get("depthCells")),
    },
  });
  revalidatePath("/settings");
  revalidatePath("/grid");
}
