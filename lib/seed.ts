import { prisma } from "./prisma";

const DEFAULT_BOX_SIZES = [
  { name: "Small",       widthIn: 12, depthIn: 12, heightIn: 12, widthCells: 1, depthCells: 1, heightCells: 1 },
  { name: "Medium",      widthIn: 12, depthIn: 12, heightIn: 24, widthCells: 1, depthCells: 1, heightCells: 2 },
  { name: "Large",       widthIn: 24, depthIn: 24, heightIn: 24, widthCells: 2, depthCells: 2, heightCells: 2 },
  { name: "Extra Large", widthIn: 24, depthIn: 24, heightIn: 36, widthCells: 2, depthCells: 2, heightCells: 3 },
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
  // skipDuplicates on box sizes and rooms prevents duplicate rows if this
  // function races (e.g. two concurrent OAuth callbacks for the same new user).
  await prisma.$transaction([
    prisma.storageUnit.upsert({
      where: { userId },
      update: {},
      create: { userId, widthCells: 10, depthCells: 20 },
    }),
    prisma.boxSize.createMany({
      data: DEFAULT_BOX_SIZES.map((size) => ({ userId, ...size })),
      skipDuplicates: true,
    }),
    prisma.room.createMany({
      data: DEFAULT_ROOMS.map((name) => ({ userId, name })),
      skipDuplicates: true,
    }),
  ]);
}
