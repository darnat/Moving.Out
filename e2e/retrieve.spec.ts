import { test, expect } from "@playwright/test";
import { cleanDatabase } from "./helpers/db";
import { loginAs } from "./helpers/auth";

test.beforeEach(async ({ page }) => {
  await cleanDatabase();
  await loginAs(page);
});

async function createAndPlaceBox(
  page: Parameters<typeof loginAs>[0],
  label: string,
  col: number,
  row: number
) {
  await page.goto("/boxes/new");
  await page.getByTestId("label-input").fill(label);
  await page.getByTestId("room-select").selectOption({ label: "Kitchen" });
  await page.getByTestId("size-select").selectOption({ label: "Small" });
  await page.getByTestId("item-input").fill("Item in " + label);
  await page.getByTestId("add-item-btn").click();
  await page.getByTestId("save-box-btn").click();
  await page.waitForURL("/");
  await page.goto("/grid");
  await page.getByTestId(`select-box-${label}`).click();
  await page.getByTestId(`grid-cell-${col}-${row}`).click();
  await page.getByTestId("stack-level-input").fill("1");
  await page.getByTestId("confirm-placement-btn").click();
  await expect(page.getByTestId(`grid-cell-${col}-${row}`)).toContainText(label);
}

test("retrieved box disappears from the grid", async ({ page }) => {
  await createAndPlaceBox(page, "BOX-R1", 0, 0);
  await page.goto("/grid");
  await expect(page.getByTestId("grid-cell-0-0")).toContainText("BOX-R1");
  await page.getByTestId("grid-cell-0-0").click();
  await page.getByTestId("retrieve-btn").click();
  await expect(page.getByTestId("grid-cell-0-0")).not.toContainText("BOX-R1");
});

test("retrieved box still appears in search with Retrieved badge", async ({
  page,
}) => {
  await createAndPlaceBox(page, "BOX-R2", 1, 1);
  await page.goto("/boxes");
  await page.getByText("BOX-R2").click();
  await page.getByTestId("retrieve-btn").click();
  await expect(page.getByTestId("un-retrieve-btn")).toBeVisible();
  await page.goto("/");
  await page.getByTestId("search-input").fill("Item in BOX-R2");
  await expect(page.getByTestId("search-results")).toContainText("BOX-R2");
  await expect(page.getByTestId("search-results")).toContainText("Retrieved");
});

test("user can un-retrieve a box", async ({ page }) => {
  await createAndPlaceBox(page, "BOX-R3", 2, 2);
  await page.goto("/grid");
  await page.getByTestId("grid-cell-2-2").click();
  await page.getByTestId("retrieve-btn").click();
  await page.goto("/boxes");
  await page.getByText("BOX-R3").click();
  await page.getByTestId("un-retrieve-btn").click();
  await expect(page.getByTestId("retrieve-btn")).toBeVisible();
});
