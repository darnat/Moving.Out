import { prisma } from "./prisma";

const DEFAULT_BOX_SIZES = [
  { name: "Small", widthCells: 1, depthCells: 1, heightCells: 1 },
  { name: "Medium", widthCells: 1, depthCells: 1, heightCells: 2 },
  { name: "Large", widthCells: 2, depthCells: 2, heightCells: 2 },
  { name: "Extra Large", widthCells: 2, depthCells: 2, heightCells: 3 },
];

const DEFAULT_ROOMS = [
  "Kitchen",
  "Living Room",
  "Bedroom",
  "Master Bedroom",
  "Bathroom",
  "Office",
  "Garage",
  "Other",
];

export async function seedUserDefaults(userId: string) {
  await Promise.all([
    prisma.storageUnit.upsert({
      where: { userId },
      update: {},
      create: { userId, widthCells: 10, depthCells: 20 },
    }),
    ...DEFAULT_BOX_SIZES.map((size) =>
      prisma.boxSize.create({ data: { userId, ...size } })
    ),
    ...DEFAULT_ROOMS.map((name) =>
      prisma.room.create({ data: { userId, name } })
    ),
  ]);
}
