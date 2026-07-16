ALTER TABLE "FurnitureItem" ADD COLUMN "borderRadius" INTEGER NOT NULL DEFAULT 0;
UPDATE "FurnitureItem" SET "borderRadius" = 50 WHERE "rounded" = true;
ALTER TABLE "FurnitureItem" DROP COLUMN "rounded";
