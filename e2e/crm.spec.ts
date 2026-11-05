import { test, expect } from "@playwright/test";
test("responsive pages, charts, routes and no browser errors", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of [
      "/",
      "/leads",
      "/deals",
      "/customers",
      "/tasks",
      "/activities",
    ]) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Overview", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".recharts-pie-sector").first()).toBeVisible();
    await page.screenshot({
      path: `test-results/dashboard-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
  }
  expect(errors).toEqual([]);
  await page.goto("/unknown");
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
});
test("CRUD persists after reload, and modal restores keyboard focus", async ({
  page,
}) => {
  await page.goto("/leads");
  const trigger = page.getByRole("button", { name: "Add lead" });
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole("button", { name: "Create record" }).click();
  await expect(page.getByText("A name or title is required")).toBeVisible();
  await page.getByLabel("Name *").fill("Browser QA Person");
  await page.getByLabel("Email", { exact: true }).fill("qa@example.com");
  await page.getByRole("button", { name: "Create record" }).click();
  await page.reload();
  await page.getByLabel("Search leads").fill("Browser QA");
  await expect(
    page.getByText("Browser QA Person", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Edit Browser QA Person", exact: true })
    .click();
  await page.getByLabel("Name *").fill("Browser QA Updated");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.reload();
  await page.getByLabel("Search leads").fill("Browser QA");
  await expect(
    page.getByText("Browser QA Updated", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Delete Browser QA Updated", exact: true })
    .click();
  await page.getByRole("button", { name: "Delete record" }).click();
  await page.reload();
  await page.getByLabel("Search leads").fill("Browser QA");
  await expect(page.getByText("No leads found")).toBeVisible();
});
test("conversion produces one customer and linked deal; stage change updates metrics", async ({
  page,
}) => {
  await page.goto("/leads");
  await page.getByLabel("Search leads").fill("Northstar");
  await page.getByRole("button", { name: "Convert", exact: true }).click();
  await page.getByRole("button", { name: "Convert lead", exact: true }).click();
  await expect(
    page.locator("tbody").getByText("Converted", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByLabel("Search leads").fill("Northstar");
  await expect(
    page.getByRole("button", { name: "Convert", exact: true }),
  ).toHaveCount(0);
  await page.goto("/customers");
  await page.getByLabel("Search customers").fill("Northstar");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.goto("/deals");
  const stage = page.getByLabel("Stage for Northstar Health opportunity", {
    exact: true,
  });
  await stage.selectOption("Closed Won");
  await page.reload();
  await expect(
    page.getByLabel("Stage for Northstar Health opportunity", { exact: true }),
  ).toHaveValue("Closed Won");
  const data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("meridian-crm-v1")!),
  );
  const expected = data.deals
    .filter((r: { status: string }) => r.status === "Closed Won")
    .reduce((sum: number, r: { value: number }) => sum + r.value, 0);
  await page.goto("/");
  const won = page.locator(".metric").filter({ hasText: "Won revenue" });
  await expect(won).toContainText(
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(expected),
  );
});
test("tasks complete and reopen; logged activity appears on its customer profile", async ({
  page,
}) => {
  await page.goto("/tasks");
  await page.getByLabel("Search tasks").fill("Schedule product");
  const row = page.locator("tbody tr").first();
  await row.getByRole("button", { name: "Complete", exact: true }).click();
  await expect(row.getByText("Completed", { exact: true })).toBeVisible();
  await row.getByRole("button", { name: "Reopen", exact: true }).click();
  await expect(row.getByText("To Do", { exact: true })).toBeVisible();
  await page.goto("/activities");
  await page.getByRole("button", { name: "Log activity" }).click();
  await page.getByLabel("Title *").fill("QA customer check-in");
  await page.getByLabel("Activity type").selectOption("Email (logged)");
  await page.getByLabel("Linked record").selectOption("customer-0");
  await page.getByRole("button", { name: "Create record" }).click();
  await page.goto("/customers/customer-0");
  await expect(
    page.getByText("QA customer check-in", { exact: true }),
  ).toBeVisible();
  await page.getByText("QA customer check-in", { exact: true }).click();
  await page.getByRole("button", { name: "Create follow-up task" }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.goto("/customers/customer-0");
  await expect(
    page.getByText("Follow up: QA customer check-in", { exact: true }),
  ).toBeVisible();
});

test("linked customer edits and confirmed deletion preserve related records", async ({
  page,
}) => {
  await page.goto("/customers/customer-0");
  await page.getByRole("button", { name: "Edit record", exact: true }).click();
  await page.getByLabel("Company", { exact: true }).fill("Acme Updated");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.goto("/deals");
  await expect(page.getByText("Acme Updated", { exact: true })).toBeVisible();
  const originalCount = await page.evaluate(
    () => JSON.parse(localStorage.getItem("meridian-crm-v1")!).deals.length,
  );
  await page.goto("/customers");
  await page.getByLabel("Search customers").fill("Acme Updated");
  await page
    .getByRole("button", { name: "Delete Ethan Carter", exact: true })
    .click();
  await expect(
    page.getByText(/Linked deals, tasks, and activities will be retained/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Delete Ethan Carter", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Delete record", exact: true })
    .click();
  await page.reload();
  const data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("meridian-crm-v1")!),
  );
  expect(data.deals.length).toBe(originalCount);
  expect(data.deals[0].customerId).toBeUndefined();
  expect(data.activities[0].linkedId).toBe("");
  await page.goto("/customers/customer-0");
  await expect(
    page.getByRole("heading", { name: "Record not found" }),
  ).toBeVisible();
});

test("keyboard modal loop, global search, mobile navigation and report export", async ({
  page,
}) => {
  await page.goto("/leads");
  await page.getByRole("button", { name: "Add lead", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Close dialog" }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Create record" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Close dialog" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await page.getByLabel("Global search").fill("Annual platform");
  await page.locator(".search-results").getByRole("link").first().click();
  await expect(page).toHaveURL(/\/deals\/deal-/);
  await page.goBack();
  await expect(page).toHaveURL(/\/leads/);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .locator("nav")
    .getByRole("link", { name: "Customers", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Customers", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".sidebar")).not.toHaveClass(/open/);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Overview", exact: true }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export report" }).click();
  expect((await download).suggestedFilename()).toBe("meridian-report.csv");
});
