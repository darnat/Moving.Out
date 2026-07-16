-- Float positions allow sub-cell (inch-accurate) placement
ALTER TABLE "Box" ALTER COLUMN "gridCol" TYPE DOUBLE PRECISION;
ALTER TABLE "Box" ALTER COLUMN "gridRow" TYPE DOUBLE PRECISION;
