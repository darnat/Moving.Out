import { Page } from "@playwright/test";

export async function loginAs(page: Page, email = "test@example.com") {
  await page.goto("/login");
  await page.getByTestId("test-email-input").fill(email);
  await page.getByTestId("test-login-btn").click();
  await page.waitForURL("/");
}
