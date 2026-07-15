import { test, expect } from "@playwright/test";
import { cleanDatabase } from "./helpers/db";
import { loginAs } from "./helpers/auth";

test.beforeEach(async ({ page }) => {
  await cleanDatabase();
  await loginAs(page);
});

async function createBox(
  page: Parameters<typeof loginAs>[0],
  label: string,
  size = "Small"
) {
  await page.goto("/boxes/new");
  await page.getByTestId("label-input").fill(label);
  await page.getByTestId("room-select").selectOption({ label: "Kitchen" });
  await page.getByTestId("size-select").selectOption({ label: size });
  await page.getByTestId("save-box-btn").click();
  await page.waitForURL("/");
}

test("unplaced box appears in unplaced list on grid page", async ({ page }) => {
  await createBox(page, "BOX-G1");
  await page.goto("/grid");
  await expect(page.getByTestId("unplaced-list")).toContainText("BOX-G1");
});

test("user can place a box on the grid", async ({ page }) => {
  await createBox(page, "BOX-G2");
  await page.goto("/grid");
  await page.getByTestId("select-box-BOX-G2").click();
  await page.getByTestId("grid-cell-0-0").click();
  await page.getByTestId("stack-level-input").fill("1");
  await page.getByTestId("confirm-placement-btn").click();
  await expect(page.getByTestId("grid-cell-0-0")).toContainText("BOX-G2");
  await expect(page.getByTestId("unplaced-list")).not.toContainText("BOX-G2"); // list still exists, empty
});

test("tapping an occupied cell shows the box info", async ({ page }) => {
  await createBox(page, "BOX-G3");
  await page.goto("/grid");
  await page.getByTestId("select-box-BOX-G3").click();
  await page.getByTestId("grid-cell-0-0").click();
  await page.getByTestId("stack-level-input").fill("1");
  await page.getByTestId("confirm-placement-btn").click();
  await expect(page.getByTestId("grid-cell-0-0")).toContainText("BOX-G3");
  await page.getByTestId("grid-cell-0-0").click();
  await expect(page.getByTestId("cell-info-panel")).toContainText("BOX-G3");
});

test("placing a box on an occupied cell shows an error", async ({ page }) => {
  await createBox(page, "BOX-G4");
  await createBox(page, "BOX-G5");
  await page.goto("/grid");
  await page.getByTestId("select-box-BOX-G4").click();
  await page.getByTestId("grid-cell-0-0").click();
  await page.getByTestId("stack-level-input").fill("1");
  await page.getByTestId("confirm-placement-btn").click();
  await expect(page.getByTestId("grid-cell-0-0")).toContainText("BOX-G4");
  await page.getByTestId("select-box-BOX-G5").click();
  await page.getByTestId("grid-cell-0-0").click();
  await page.getByTestId("stack-level-input").fill("1");
  await page.getByTestId("confirm-placement-btn").click();
  await expect(page.getByTestId("placement-error")).toBeVisible();
  await expect(page.getByTestId("grid-cell-0-0")).toContainText("BOX-G4");
});

test("user can unplace a box", async ({ page }) => {
  await createBox(page, "BOX-G6");
  await page.goto("/grid");
  await page.getByTestId("select-box-BOX-G6").click();
  await page.getByTestId("grid-cell-1-0").click();
  await page.getByTestId("stack-level-input").fill("1");
  await page.getByTestId("confirm-placement-btn").click();
  await expect(page.getByTestId("grid-cell-1-0")).toContainText("BOX-G6");
  await page.getByTestId("grid-cell-1-0").click();
  await page.getByTestId("unplace-btn").click();
  await expect(page.getByTestId("unplaced-list")).toContainText("BOX-G6");
  await expect(page.getByTestId("grid-cell-1-0")).not.toContainText("BOX-G6");
});
