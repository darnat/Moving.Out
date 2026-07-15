import { test, expect } from "@playwright/test";
import { cleanDatabase } from "./helpers/db";
import { loginAs } from "./helpers/auth";

test.beforeEach(async ({ page }) => {
  await cleanDatabase();
  await loginAs(page);
});

async function createBoxWithItems(
  page: Parameters<typeof loginAs>[0],
  label: string,
  room: string,
  items: string[]
) {
  await page.goto("/boxes/new");
  await page.getByTestId("label-input").fill(label);
  await page.getByTestId("room-select").selectOption({ label: room });
  await page.getByTestId("size-select").selectOption({ label: "Small" });
  for (const item of items) {
    await page.getByTestId("item-input").fill(item);
    await page.getByTestId("add-item-btn").click();
  }
  await page.getByTestId("save-box-btn").click();
  await page.waitForURL("/");
}

test("text search returns box containing the item", async ({ page }) => {
  await createBoxWithItems(page, "BOX-S1", "Kitchen", ["Coffee machine", "Mugs"]);
  await page.goto("/");
  await page.getByTestId("search-input").fill("Coffee");
  await expect(page.getByTestId("search-results")).toContainText("BOX-S1");
  await expect(page.getByTestId("search-results")).toContainText("Coffee machine");
});

test("search shows grid position when box is placed", async ({ page }) => {
  await createBoxWithItems(page, "BOX-S2", "Kitchen", ["Blender"]);
  await page.goto("/grid");
  await page.getByTestId("select-box-BOX-S2").click();
  await page.getByTestId("grid-cell-2-3").click();
  await page.getByTestId("stack-level-input").fill("1");
  await page.getByTestId("confirm-placement-btn").click();
  await expect(page.getByTestId("grid-cell-2-3")).toContainText("BOX-S2");
  await page.goto("/");
  await page.getByTestId("search-input").fill("Blender");
  await expect(page.getByTestId("search-results")).toContainText("Col 2");
  await expect(page.getByTestId("search-results")).toContainText("Row 3");
  await expect(page.getByTestId("search-results")).toContainText("Level 1");
});

test("room filter narrows search results", async ({ page }) => {
  await createBoxWithItems(page, "BOX-S3", "Kitchen", ["Toaster"]);
  await createBoxWithItems(page, "BOX-S4", "Bedroom", ["Toaster covers"]);
  await page.goto("/");
  await page.getByTestId("search-input").fill("Toaster");
  await page.getByTestId("room-filter").selectOption({ label: "Kitchen" });
  await expect(page.getByTestId("search-results")).toContainText("BOX-S3");
  await expect(page.getByTestId("search-results")).not.toContainText("BOX-S4");
});

test("search results update as user types", async ({ page }) => {
  await createBoxWithItems(page, "BOX-S5", "Office", ["Stapler"]);
  await page.goto("/");
  await page.getByTestId("search-input").fill("Sta");
  await expect(page.getByTestId("search-results")).toContainText("Stapler");
  await page.getByTestId("search-input").fill("xyz-no-match");
  await expect(page.getByTestId("search-results")).not.toContainText("Stapler");
});

test("tapping a search result opens the box detail", async ({ page }) => {
  await createBoxWithItems(page, "BOX-S6", "Bathroom", ["Towels"]);
  await page.goto("/");
  await page.getByTestId("search-input").fill("Towels");
  await page.getByTestId("search-results").getByText("BOX-S6").click();
  await expect(page).toHaveURL(/\/boxes\//);
  await expect(page.getByText("Towels")).toBeVisible();
});
