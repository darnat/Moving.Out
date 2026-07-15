"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/actions/auth";
import { prisma } from "@/lib/prisma";

export async function addBoxSize(formData: FormData) {
  const userId = await requireUserId();
  await prisma.boxSize.create({
    data: {
      userId,
      name: formData.get("name") as string,
      widthCells: Number(formData.get("widthCells")),
      depthCells: Number(formData.get("depthCells")),
      heightCells: Number(formData.get("heightCells")),
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
