import { expect, test } from "@playwright/test";
import { login } from "./helpers/auth";

test("catalog search, completion filter and selected playlist use real content", async ({
  page,
}) => {
  await login(page, "catalog", "/home");
  await expect(page.getByText("No playlist selected", { exact: true })).toBeVisible();
  await page.getByRole("searchbox", { name: "Search playlists" }).fill("absent");
  await expect(page.getByText("No playlists found", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear search" }).click();
  await page.getByRole("button", { name: "Filter playlists" }).click();
  await page.getByLabel("Completion filter").selectOption("completed");
  await expect(page.getByText("No playlists found", { exact: true })).toBeVisible();
  await page.getByLabel("Completion filter").selectOption("all");
  await page.getByRole("link", { name: "Voice Comparison", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Voice Comparison" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Puck" })).toBeChecked();
  await expect(page.getByRole("radio", { name: "Harper" })).toBeVisible();
  await expect(page.getByText(/Alice|Mode 1/)).toHaveCount(0);
  await page.setViewportSize({ width: 375, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("link", { name: "Playlists", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/home$/);
});
