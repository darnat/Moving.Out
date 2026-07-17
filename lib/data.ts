import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export function userTag(userId: string) {
  return `user-${userId}`;
}

export const getCachedBoxes = (userId: string) =>
  unstable_cache(
    () =>
      prisma.box.findMany({
        where: { userId },
        include: { room: true, boxSize: true, items: true },
        orderBy: { id: "desc" },
      }),
    ["boxes", userId],
    { tags: [userTag(userId)] }
  )();

export const getCachedGridBoxes = (userId: string) =>
  unstable_cache(
    () =>
      prisma.box.findMany({
        where: { userId, retrieved: false },
        include: { boxSize: true, room: true },
        orderBy: { labelNumber: "asc" },
      }),
    ["grid-boxes", userId],
    { tags: [userTag(userId)] }
  )();

export const getCachedRooms = (userId: string) =>
  unstable_cache(
    () =>
      prisma.room.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    ["rooms", userId],
    { tags: [userTag(userId)] }
  )();

export const getCachedStorageUnit = (userId: string) =>
  unstable_cache(
    () => prisma.storageUnit.findUnique({ where: { userId } }),
    ["storage-unit", userId],
    { tags: [userTag(userId)] }
  )();

export const getCachedBox = (id: string, userId: string) =>
  unstable_cache(
    () =>
      prisma.box.findFirst({
        where: { id, userId },
        include: { room: true, boxSize: true, items: true, photos: true },
      }),
    ["box", id, userId],
    { tags: [userTag(userId)] }
  )();

export const getCachedBoxSizes = (userId: string) =>
  unstable_cache(
    () =>
      prisma.boxSize.findMany({ where: { userId, isOneOff: false }, orderBy: { name: "asc" } }),
    ["box-sizes", userId],
    { tags: [userTag(userId)] }
  )();

export const getCachedFurnitureItems = (userId: string) =>
  unstable_cache(
    () =>
      prisma.furnitureItem.findMany({
        where: { userId },
        orderBy: [{ groupName: "asc" }, { name: "asc" }],
      }),
    ["furniture-items", userId],
    { tags: [userTag(userId)] }
  )();
