import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations use the non-pooling URL (direct connection required by Prisma migrate)
    // Runtime queries use DATABASE_URL which can be the pooler URL
    url: process.env.DATABASE_URL_NON_POOLING ?? process.env.DATABASE_URL!,
  },
});
