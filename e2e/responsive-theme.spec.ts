import { test, expect } from "@playwright/test";

test("all requested widths and themes keep CRM pages and details contained", async ({
  page,
}) => {
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" || /width.*height.*greater than 0/i.test(m.text()))
      errors.push(m.text());
  });
  for (const width of [360, 375, 390, 768, 820, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ["light", "dark"]) {
      await page.goto("/");
      await page.getByLabel("Color theme").selectOption(theme);
      for (const route of [
        "/",
        "/leads",
        "/customers",
        "/tasks",
        "/activities",
        "/deals",
        "/leads/lead-0",
        "/customers/customer-0",
      ]) {
        await page.goto(route);
        await expect(page.locator("h1")).toBeVisible();
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${width} ${theme} ${route}`,
        ).toBe(true);
      }
    }
  }
  expect(errors).toEqual([]);
});

test("theme persistence, invalid storage, system changes and drawer keyboard access", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByLabel("Color theme").selectOption("light");
  await page.reload();
  await expect(page.getByLabel("Color theme")).toHaveValue("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByLabel("Color theme").selectOption("system");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.evaluate(() => localStorage.setItem("meridian-theme", "invalid"));
  await page.reload();
  await expect(page.getByLabel("Color theme")).toHaveValue("system");
  for (const width of [360, 820]) {
    await page.setViewportSize({ width, height: 700 });
    const trigger = page.getByRole("button", { name: "Open navigation" });
    await trigger.click();
    await expect(page.locator(".sidebar")).toHaveClass(/open/);
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe(
      "hidden",
    );
    await page.keyboard.press("Shift+Tab");
    expect(
      await page.evaluate(() => !!document.activeElement?.closest(".sidebar")),
    ).toBe(true);
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page
      .locator("nav")
      .getByRole("link", { name: "Customers", exact: true })
      .click();
    await expect(page.locator(".sidebar")).not.toHaveClass(/open/);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
    await trigger.click();
    await page
      .locator(".sidebar-overlay")
      .click({ position: { x: width - 10, y: 500 } });
    await expect(trigger).toBeFocused();
  }
});

test("small-height dialogs, filters, pagination and mobile pipeline changes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 480 });
  for (const theme of ["light", "dark"]) {
    for (const route of [
      "/leads",
      "/customers",
      "/tasks",
      "/activities",
      "/deals",
    ]) {
      await page.goto(route);
      await page.getByLabel("Color theme").selectOption(theme);
      await page.locator(".page-heading > button").click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      const rect = await dialog.boundingBox();
      expect(rect!.height).toBeLessThanOrEqual(480);
      await dialog.getByRole("button", { name: "Create record" }).click();
      await expect(page.getByText("A name or title is required")).toBeVisible();
      await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(dialog).toHaveCount(0);
    }
  }
  await page.goto("/leads");
  await page.getByLabel("Search leads").fill("Northstar");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByLabel("Search leads").fill("");
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.locator(".pagination")).toContainText("2 /");
  await page.getByLabel("Filter status").selectOption("Qualified");
  await expect(page.locator(".pagination")).toContainText("1 /");
  await page.goto("/deals");
  const deal = page.locator(".deal-card").first();
  const href = await deal.getByRole("link").getAttribute("href");
  const stage = deal.locator("select");
  await stage.selectOption("Closed Won");
  await page.reload();
  await expect(
    page
      .locator(".deal-card")
      .filter({ has: page.locator(`a[href="${href}"]`) })
      .locator("select"),
  ).toHaveValue("Closed Won");
  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(page.locator("table")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("desktop collapse, themed chart tooltip and visual captures", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.getByRole("button", { name: "Toggle sidebar" }).click();
  await expect(page.locator(".app")).toHaveClass(/collapsed/);
  await page.getByRole("button", { name: "Toggle sidebar" }).click();
  await expect(page.locator(".app")).not.toHaveClass(/collapsed/);
  for (const width of [360, 820, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ["light", "dark"]) {
      await page.getByLabel("Color theme").selectOption(theme);
      await expect(page.locator(".recharts-pie-sector").first()).toBeVisible();
      await page.screenshot({
        path: `test-results/theme-${theme}-${width}.png`,
        fullPage: true,
        animations: "disabled",
      });
    }
  }
  const sector = await page
    .locator(".recharts-pie-sector")
    .first()
    .boundingBox();
  // Aim inside the donut ring; its bounding-box center is in the empty hole.
  await page.mouse.move(
    sector!.x + sector!.width * 0.65,
    sector!.y + sector!.height * 0.35,
  );
  await expect(page.locator(".donut .recharts-default-tooltip")).toBeVisible();
  expect(
    await page
      .locator(".donut .recharts-default-tooltip")
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe("rgb(25, 34, 52)");
});

 test.beforeEach(async ({page})=>{await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('admin@meridian.demo');await page.getByLabel('Password',{exact:true}).fill('Meridian2026!');await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByRole('heading',{name:'Overview',exact:true})).toBeVisible();});
