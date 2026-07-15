import { test, expect } from "@playwright/test";
import { cleanDatabase } from "./helpers/db";
import { loginAs } from "./helpers/auth";

test.beforeEach(async ({ page }) => {
  await cleanDatabase();
  await loginAs(page);
});

test("default box sizes are seeded on first login", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByText("Small", { exact: true })).toBeVisible();
  await expect(page.getByText("Medium", { exact: true })).toBeVisible();
  await expect(page.getByText("Large", { exact: true })).toBeVisible();
  await expect(page.getByText("Extra Large", { exact: true })).toBeVisible();
});

test("default rooms are seeded on first login", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByText("Kitchen")).toBeVisible();
  await expect(page.getByText("Bedroom", { exact: true })).toBeVisible();
  await expect(page.getByText("Garage")).toBeVisible();
});

test("user can add a custom box size", async ({ page }) => {
  await page.goto("/settings");
  await page.getByTestId("new-box-size-name").fill("Wardrobe Box");
  await page.getByTestId("new-box-size-width").fill("2");
  await page.getByTestId("new-box-size-depth").fill("1");
  await page.getByTestId("new-box-size-height").fill("4");
  await page.getByTestId("add-box-size-btn").click();
  await expect(page.getByText("Wardrobe Box")).toBeVisible();
});

test("user can add a custom room", async ({ page }) => {
  await page.goto("/settings");
  await page.getByTestId("new-room-name").fill("Basement");
  await page.getByTestId("add-room-btn").click();
  await expect(page.getByText("Basement")).toBeVisible();
});

test("user can delete a box size", async ({ page }) => {
  await page.goto("/settings");
  await page
    .getByTestId("box-size-row-Small")
    .getByTestId("delete-box-size-btn")
    .click();
  await expect(page.getByText("Small")).not.toBeVisible();
});

test("user can delete a room", async ({ page }) => {
  await page.goto("/settings");
  await page
    .getByTestId("room-row-Kitchen")
    .getByTestId("delete-room-btn")
    .click();
  await expect(page.getByText("Kitchen")).not.toBeVisible();
});

test("user can update storage unit dimensions", async ({ page }) => {
  await page.goto("/settings");
  await page.getByTestId("storage-width").fill("8");
  await page.getByTestId("storage-depth").fill("15");
  await page.getByTestId("save-storage-btn").click();
  await expect(page.getByTestId("storage-width")).toHaveValue("8");
  await expect(page.getByTestId("storage-depth")).toHaveValue("15");
});
