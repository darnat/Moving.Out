import { test, expect } from "@playwright/test";
import { cleanDatabase } from "./helpers/db";

test.beforeEach(async () => {
  await cleanDatabase();
});

test("unauthenticated user is redirected to login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});

test("test login succeeds and redirects to dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByTestId("test-email-input").fill("test@example.com");
  await page.getByTestId("test-login-btn").click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: /moving out/i })).toBeVisible();
});
