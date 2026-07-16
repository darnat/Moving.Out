-- CreateTable
CREATE TABLE "FurnitureItem" (
    "id"         TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "name"       TEXT NOT NULL,
    "groupName"  TEXT,
    "widthIn"    DOUBLE PRECISION NOT NULL,
    "depthIn"    DOUBLE PRECISION NOT NULL,
    "heightIn"   DOUBLE PRECISION NOT NULL,
    "gridCol"    DOUBLE PRECISION,
    "gridRow"    DOUBLE PRECISION,
    "stackLevel" DOUBLE PRECISION,

    CONSTRAINT "FurnitureItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FurnitureItem" ADD CONSTRAINT "FurnitureItem_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
