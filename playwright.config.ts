import { defineConfig, devices } from "@playwright/test";
import path from "path";

const testEnv = {
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/moving_out_test",
  AUTH_SECRET: "test-secret-for-playwright",
  ALLOWED_EMAIL: "test@example.com",
  PLAYWRIGHT_TEST: "true",
  NEXT_PUBLIC_PLAYWRIGHT_TEST: "true",
  BLOB_READ_WRITE_TOKEN: "test-blob-token",
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "next dev -p 3001",
    url: "http://localhost:3001",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: testEnv,
  },
  globalSetup: path.resolve("./e2e/helpers/global-setup.ts"),
});
