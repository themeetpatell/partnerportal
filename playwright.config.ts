import { defineConfig, devices } from "@playwright/test"

/**
 * Smoke tests for both Next apps (partner :3000, admin :3001).
 * Run `npm run dev` in another terminal, or rely on webServer below.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    // Partner is usually ready first; `npm run dev` starts both apps together.
    url: "http://localhost:3000/sign-in",
    timeout: 360_000,
    reuseExistingServer: !process.env.CI,
  },
})
