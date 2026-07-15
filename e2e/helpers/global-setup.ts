import { execSync } from "child_process";

export default async function globalSetup() {
  execSync(
    "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/moving_out_test npx prisma migrate deploy",
    { stdio: "inherit" }
  );
}
