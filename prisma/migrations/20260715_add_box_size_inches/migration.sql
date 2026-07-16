ALTER TABLE "BoxSize" ADD COLUMN "widthIn"  INTEGER NOT NULL DEFAULT 12;
ALTER TABLE "BoxSize" ADD COLUMN "depthIn"  INTEGER NOT NULL DEFAULT 12;
ALTER TABLE "BoxSize" ADD COLUMN "heightIn" INTEGER NOT NULL DEFAULT 12;

-- Back-fill existing rows: 1 cell ≈ 12 inches
UPDATE "BoxSize" SET
  "widthIn"  = "widthCells"  * 12,
  "depthIn"  = "depthCells"  * 12,
  "heightIn" = "heightCells" * 12;

ALTER TABLE "BoxSize" ALTER COLUMN "widthIn"  DROP DEFAULT;
ALTER TABLE "BoxSize" ALTER COLUMN "depthIn"  DROP DEFAULT;
ALTER TABLE "BoxSize" ALTER COLUMN "heightIn" DROP DEFAULT;
