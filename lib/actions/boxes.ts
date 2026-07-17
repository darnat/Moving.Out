"use server";

import { updateTag, revalidatePath } from "next/cache";
import { userTag } from "@/lib/data";
import { requireUserId } from "@/lib/actions/auth";
import { prisma } from "@/lib/prisma";

export async function createBox(formData: FormData) {
  const userId = await requireUserId();
  const labelNumber = formData.get("labelNumber") as string;
  const qrCode = (formData.get("qrCode") as string) || null;
  const roomId = formData.get("roomId") as string;
  const itemsJson = formData.get("items") as string;
  const items: string[] = itemsJson ? JSON.parse(itemsJson) : [];

  let boxSizeId = formData.get("boxSizeId") as string;

  if (boxSizeId === "custom") {
    const w = parseInt(formData.get("customW") as string, 10);
    const d = parseInt(formData.get("customD") as string, 10);
    const h = parseInt(formData.get("customH") as string, 10);
    const oneOff = await prisma.boxSize.create({
      data: {
        userId,
        name: `${w}"×${d}"×${h}"`,
        widthIn: w, depthIn: d, heightIn: h,
        widthCells: Math.max(1, Math.round(w / 12)),
        depthCells: Math.max(1, Math.round(d / 12)),
        heightCells: Math.max(1, Math.round(h / 12)),
        isOneOff: true,
      },
    });
    boxSizeId = oneOff.id;
  }

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

  updateTag(userTag(userId));
  return box.id;
}

export async function findBoxByQrCode(qrCode: string) {
  const userId = await requireUserId();
  const box = await prisma.box.findFirst({ where: { qrCode, userId } });
  return box?.id ?? null;
}

export async function findBoxSummaryByQrCode(qrCode: string) {
  const userId = await requireUserId();
  const box = await prisma.box.findFirst({
    where: { qrCode, userId },
    include: { room: true, items: { take: 5 } },
  });
  if (!box) return null;
  return {
    id: box.id,
    labelNumber: box.labelNumber,
    retrieved: box.retrieved,
    room: { name: box.room.name },
    items: box.items.map((i) => i.name),
    gridCol: box.gridCol,
    gridRow: box.gridRow,
    stackLevel: box.stackLevel,
  };
}

export async function addItem(boxId: string, name: string) {
  const userId = await requireUserId();
  const box = await prisma.box.findFirst({ where: { id: boxId, userId } });
  if (!box) throw new Error("Box not found");
  await prisma.item.create({ data: { boxId, name } });
  updateTag(userTag(userId));
}

export async function removeItem(itemId: string) {
  const userId = await requireUserId();
  const item = await prisma.item.findFirst({
    where: { id: itemId, box: { userId } },
  });
  if (!item) throw new Error("Item not found");
  await prisma.item.delete({ where: { id: itemId } });
  updateTag(userTag(userId));
}

export async function deleteBox(boxId: string) {
  const userId = await requireUserId();
  await prisma.box.deleteMany({ where: { id: boxId, userId } });
  updateTag(userTag(userId));
}

export async function addPhoto(boxId: string, url: string) {
  const userId = await requireUserId();
  const box = await prisma.box.findFirst({ where: { id: boxId, userId } });
  if (!box) throw new Error("Box not found");
  await prisma.photo.create({ data: { boxId, url } });
  updateTag(userTag(userId));
}

export async function removePhoto(photoId: string) {
  const userId = await requireUserId();
  const photo = await prisma.photo.findFirst({
    where: { id: photoId, box: { userId } },
  });
  if (!photo) throw new Error("Photo not found");
  await prisma.photo.delete({ where: { id: photoId } });
  updateTag(userTag(userId));
}

export async function updateBoxRoom(boxId: string, roomId: string) {
  const userId = await requireUserId();
  const [box, room] = await Promise.all([
    prisma.box.findFirst({ where: { id: boxId, userId } }),
    prisma.room.findFirst({ where: { id: roomId, userId } }),
  ]);
  if (!box || !room) throw new Error("Not found");
  await prisma.box.update({ where: { id: boxId }, data: { roomId } });
  updateTag(userTag(userId));
}

export async function updateBoxIcon(boxId: string, icon: string | null) {
  const userId = await requireUserId();
  await prisma.box.updateMany({ where: { id: boxId, userId }, data: { icon } });
  updateTag(userTag(userId));
  revalidatePath("/boxes");
}

export async function updateBoxLabel(boxId: string, labelNumber: string) {
  const userId = await requireUserId();
  await prisma.box.updateMany({ where: { id: boxId, userId }, data: { labelNumber } });
  updateTag(userTag(userId));
}

export async function setRetrieved(boxId: string, retrieved: boolean) {
  const userId = await requireUserId();
  await prisma.box.updateMany({
    where: { id: boxId, userId },
    data: { retrieved },
  });
  updateTag(userTag(userId));
}
