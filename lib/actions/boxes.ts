"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/actions/auth";
import { prisma } from "@/lib/prisma";

export async function createBox(formData: FormData) {
  const userId = await requireUserId();
  const labelNumber = formData.get("labelNumber") as string;
  const qrCode = (formData.get("qrCode") as string) || null;
  const roomId = formData.get("roomId") as string;
  const boxSizeId = formData.get("boxSizeId") as string;
  const itemsJson = formData.get("items") as string;
  const items: string[] = itemsJson ? JSON.parse(itemsJson) : [];

  const box = await prisma.box.create({
    data: {
      labelNumber,
      qrCode,
      userId,
      roomId,
      boxSizeId,
      items: {
        create: items.map((name) => ({ name })),
      },
    },
  });

  revalidatePath("/");
  return box.id;
}

export async function findBoxByQrCode(qrCode: string) {
  const userId = await requireUserId();
  const box = await prisma.box.findFirst({ where: { qrCode, userId } });
  return box?.id ?? null;
}

export async function addItem(boxId: string, name: string) {
  const userId = await requireUserId();
  const box = await prisma.box.findFirst({ where: { id: boxId, userId } });
  if (!box) throw new Error("Box not found");
  await prisma.item.create({ data: { boxId, name } });
  revalidatePath(`/boxes/${boxId}`);
}

export async function removeItem(itemId: string) {
  const userId = await requireUserId();
  const item = await prisma.item.findFirst({
    where: { id: itemId, box: { userId } },
  });
  if (!item) throw new Error("Item not found");
  await prisma.item.delete({ where: { id: itemId } });
  revalidatePath(`/boxes/${item.boxId}`);
}

export async function deleteBox(boxId: string) {
  const userId = await requireUserId();
  await prisma.box.deleteMany({ where: { id: boxId, userId } });
  revalidatePath("/");
}

export async function addPhoto(boxId: string, url: string) {
  const userId = await requireUserId();
  const box = await prisma.box.findFirst({ where: { id: boxId, userId } });
  if (!box) throw new Error("Box not found");
  await prisma.photo.create({ data: { boxId, url } });
  revalidatePath(`/boxes/${boxId}`);
}

export async function removePhoto(photoId: string) {
  const userId = await requireUserId();
  const photo = await prisma.photo.findFirst({
    where: { id: photoId, box: { userId } },
  });
  if (!photo) throw new Error("Photo not found");
  await prisma.photo.delete({ where: { id: photoId } });
  revalidatePath(`/boxes/${photo.boxId}`);
}

export async function setRetrieved(boxId: string, retrieved: boolean) {
  const userId = await requireUserId();
  await prisma.box.updateMany({
    where: { id: boxId, userId },
    data: { retrieved },
  });
  revalidatePath(`/boxes/${boxId}`);
  revalidatePath("/grid");
  revalidatePath("/");
  revalidatePath("/boxes");
}
