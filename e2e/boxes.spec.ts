import { test, expect } from "@playwright/test";
import { cleanDatabase } from "./helpers/db";
import { loginAs } from "./helpers/auth";

test.beforeEach(async ({ page }) => {
  await cleanDatabase();
  await loginAs(page);
});

test("user can register a box with manual label entry", async ({ page }) => {
  await page.goto("/boxes/new");
  await page.getByTestId("label-input").fill("BOX-001");
  await page.getByTestId("room-select").selectOption({ label: "Kitchen" });
  await page.getByTestId("size-select").selectOption({ label: "Medium" });
  await page.getByTestId("item-input").fill("Coffee machine");
  await page.getByTestId("add-item-btn").click();
  await page.getByTestId("item-input").fill("Mugs");
  await page.getByTestId("add-item-btn").click();
  await page.getByTestId("save-box-btn").click();
  await expect(page).toHaveURL("/");
  await expect(page.getByText("BOX-001")).toBeVisible();
});

test("added items appear in list while registering", async ({ page }) => {
  await page.goto("/boxes/new");
  await page.getByTestId("item-input").fill("Kettle");
  await page.getByTestId("add-item-btn").click();
  await expect(page.getByTestId("item-list")).toContainText("Kettle");
});

test("user can remove an item while registering", async ({ page }) => {
  await page.goto("/boxes/new");
  await page.getByTestId("item-input").fill("Toaster");
  await page.getByTestId("add-item-btn").click();
  await page.getByTestId("remove-item-Toaster").click();
  await expect(page.getByTestId("item-list")).not.toContainText("Toaster");
});

test("user can view box detail page", async ({ page }) => {
  await page.goto("/boxes/new");
  await page.getByTestId("label-input").fill("BOX-002");
  await page.getByTestId("room-select").selectOption({ label: "Kitchen" });
  await page.getByTestId("size-select").selectOption({ label: "Small" });
  await page.getByTestId("item-input").fill("Plates");
  await page.getByTestId("add-item-btn").click();
  await page.getByTestId("save-box-btn").click();
  await page.getByText("BOX-002").click();
  await expect(page.getByText("Plates")).toBeVisible();
  await expect(page.getByText("Kitchen")).toBeVisible();
});

test("user can add items to a saved box", async ({ page }) => {
  await page.goto("/boxes/new");
  await page.getByTestId("label-input").fill("BOX-003");
  await page.getByTestId("room-select").selectOption({ label: "Bedroom" });
  await page.getByTestId("size-select").selectOption({ label: "Large" });
  await page.getByTestId("save-box-btn").click();
  await page.getByText("BOX-003").click();
  await page.getByTestId("item-input").fill("Pillow");
  await page.getByTestId("add-item-btn").click();
  await expect(page.getByText("Pillow")).toBeVisible();
});

test("user can remove an item from a saved box", async ({ page }) => {
  await page.goto("/boxes/new");
  await page.getByTestId("label-input").fill("BOX-004");
  await page.getByTestId("room-select").selectOption({ label: "Bedroom" });
  await page.getByTestId("size-select").selectOption({ label: "Small" });
  await page.getByTestId("item-input").fill("Lamp");
  await page.getByTestId("add-item-btn").click();
  await page.getByTestId("save-box-btn").click();
  await page.getByText("BOX-004").click();
  await page.getByTestId("remove-item-Lamp").click();
  await expect(page.getByText("Lamp")).not.toBeVisible();
});

test("user can delete a box", async ({ page }) => {
  await page.goto("/boxes/new");
  await page.getByTestId("label-input").fill("BOX-005");
  await page.getByTestId("room-select").selectOption({ label: "Office" });
  await page.getByTestId("size-select").selectOption({ label: "Small" });
  await page.getByTestId("save-box-btn").click();
  await page.getByText("BOX-005").click();
  await page.getByTestId("delete-box-btn").click();
  await expect(page).toHaveURL("/");
  await expect(page.getByText("BOX-005")).not.toBeVisible();
});
