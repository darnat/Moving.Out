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
