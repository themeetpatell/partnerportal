import { test, expect } from "@playwright/test"

test("partner portal sign-in page loads", async ({ page }) => {
  await page.goto("http://localhost:3000/sign-in")
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible({
    timeout: 60_000,
  })
})

test("admin portal sign-in page loads", async ({ page }) => {
  await page.goto("http://localhost:3001/sign-in")
  await expect(page.getByRole("heading", { name: "Admin Portal" })).toBeVisible({
    timeout: 60_000,
  })
})
