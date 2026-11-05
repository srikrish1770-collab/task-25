import { defineConfig } from "@playwright/test";

// Run against built assets, independently of the development-server test suite.
export default defineConfig({
  testDir: "./e2e-production",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4173",
    channel: "msedge",
    headless: true,
  },
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
  },
  reporter: "list",
});
