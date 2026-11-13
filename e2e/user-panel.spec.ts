import { test, expect } from "@playwright/test";
async function login(
  page: import("@playwright/test").Page,
  email = "sales@meridian.demo",
) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("Meridian2026!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Overview", exact: true }),
  ).toBeVisible();
}
test("user routes at every requested width, portrait and landscape", async ({
  page,
}) => {
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page);
  for (const width of [320, 375, 390, 428, 768, 820, 1024, 1280, 1440, 1920]) {
    for (const height of [900, 400]) {
      await page.setViewportSize({ width, height });
      for (const route of [
        "/",
        "/leads",
        "/deals",
        "/customers",
        "/tasks",
        "/activities",
        "/reports",
        "/notifications",
        "/settings",
      ]) {
        await page.goto(route);
        await expect(page.locator("h1")).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${width}x${height} ${route}`,
        ).toBe(true);
      }
    }
  }
  expect(errors).toEqual([]);
});
test("role access, profile persistence, notifications and logout", async ({
  page,
}) => {
  await login(page);
  await page.goto("/leads");
  await expect(page.getByRole("button", { name: /Delete / })).toHaveCount(0);
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Access denied", exact: true }),
  ).toBeVisible();
  await page.goto("/leads/lead-0");
  await expect(
    page.getByRole("heading", { name: "Access denied or record not found" }),
  ).toBeVisible();
  await page.goto("/settings");
  await page.getByLabel("Full name").fill("Sarah Updated");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByRole("status")).toContainText("Settings saved");
  await page.reload();
  await expect(page.getByLabel("Full name")).toHaveValue("Sarah Updated");
  await page.goto("/notifications");
  await page.getByRole("button", { name: "Mark all as read" }).click();
  await page.reload();
  await expect(page.getByLabel("Notifications, 0 unread")).toBeVisible();
  await page.getByRole("button", { name: "Logout", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  await page.goto("/tasks");
  await expect(page).toHaveURL(/login/);
});
test("simulated recovery resets only the selected demo account", async ({
  page,
}) => {
  await page.goto("/forgot-password");
  await page
    .getByLabel("Email", { exact: true })
    .fill("employee@meridian.demo");
  await page.getByRole("button", { name: "Continue" }).click();
  const code = await page.locator("strong").innerText();
  await page.getByLabel("Verification code").fill(code);
  await page.getByRole("button", { name: "Continue" }).click();
  await page
    .getByLabel("Password", { exact: true })
    .fill("Updated2026!Password");
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("Updated2026!Password");
  await page.getByRole("button", { name: "Continue" }).click();
  await page
    .getByLabel("Email", { exact: true })
    .fill("employee@meridian.demo");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Updated2026!Password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Overview", exact: true }),
  ).toBeVisible();
});

test('sales record creation and manager team boundaries', async ({page})=>{
 await login(page);
 await page.goto('/leads');
 await page.getByRole('button',{name:'Add lead',exact:true}).click();
 await page.getByLabel('Name *',{exact:true}).fill('Owned sales lead');
 await expect(page.getByLabel('Owner / assignee')).toHaveValue('Sarah Chen');
 await expect(page.getByLabel('Owner / assignee').locator('option')).toHaveCount(1);
 await page.getByRole('button',{name:'Create record',exact:true}).click();
 await page.getByLabel('Search leads').fill('Owned sales lead');
 await expect(page.locator('tbody').getByText('Owned sales lead',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Edit Owned sales lead',exact:true}).click();
 await page.getByRole('dialog').getByLabel('Status').selectOption('Contacted');
 await page.getByRole('button',{name:'Save changes',exact:true}).click();
 await page.reload();
 await page.getByLabel('Search leads').fill('Owned sales lead');
 await expect(page.locator('tbody')).toContainText('Contacted');
 await page.getByRole('button',{name:'Logout',exact:true}).click();
 await login(page,'manager@meridian.demo');
 await page.goto('/leads');
 await expect(page.getByLabel('Filter owner').locator('option')).toHaveText(['All owners','Sarah Chen','James Wilson','Olivia Brooks']);
 await page.goto('/leads/lead-0');
 await expect(page.getByRole('heading',{name:'Access denied or record not found'})).toBeVisible();
});
