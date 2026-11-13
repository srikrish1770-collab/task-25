import { test, expect } from "@playwright/test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname, relative, sep, extname } from "node:path";
import ts from "typescript";

function filesIn(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? filesIn(path) : [path];
  });
}

test("deployment JSON, output files and relative import casing are valid", () => {
  const root = process.cwd();
  const configBytes = readFileSync("vercel.json");
  const ignoreBytes = readFileSync(".gitignore");
  expect(configBytes.subarray(0, 3).toString("hex")).not.toBe("efbbbf");
  expect(ignoreBytes.subarray(0, 3).toString("hex")).not.toBe("efbbbf");
  const config = JSON.parse(configBytes.toString("utf8"));
  expect(config).toEqual({
    $schema: "https://openapi.vercel.sh/vercel.json",
    framework: "vite",
    buildCommand: "npm run build",
    outputDirectory: "dist",
    rewrites: [{ source: "/(.*)", destination: "/index.html" }],
  });
  expect(statSync("dist/index.html").isFile()).toBe(true);
  expect(filesIn("dist/assets").some((file) => file.endsWith(".js"))).toBe(
    true,
  );
  expect(filesIn("dist/assets").some((file) => file.endsWith(".css"))).toBe(
    true,
  );
  for (const file of filesIn("src").filter((file) =>
    /\.[cm]?[jt]sx?$/.test(file),
  )) {
    const source = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    const imports: string[] = [];
    function visit(node: ts.Node) {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        imports.push(node.moduleSpecifier.text);
      }
      if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        imports.push(node.arguments[0].text);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    for (const specifier of imports.filter((value) => value.startsWith("."))) {
      const target = resolve(dirname(file), specifier);
      const candidates = [
        target,
        ...[".ts", ".tsx", ".js", ".jsx", ".json", ".css"].map(
          (ext) => target + ext,
        ),
        resolve(target, "index.ts"),
        resolve(target, "index.tsx"),
      ];
      const found = candidates.find((candidate) => {
        try {
          return statSync(candidate).isFile();
        } catch {
          return false;
        }
      });
      expect(
        found,
        `${relative(root, file)}: unresolved import ${specifier}`,
      ).toBeTruthy();
      let cursor = root;
      for (const segment of relative(root, found!).split(sep)) {
        expect(
          readdirSync(cursor),
          `Linux casing mismatch in ${relative(root, file)}: ${specifier}`,
        ).toContain(segment);
        cursor = resolve(cursor, segment);
      }
    }
  }
});

test("every built JS, CSS and public asset serves with the correct content type", async ({
  request,
}) => {
  const root = resolve("dist");
  const files = filesIn(root);
  for (const file of files) {
    const url =
      "/" + relative(root, file).split(sep).map(encodeURIComponent).join("/");
    const response = await request.get(url);
    expect(response.status(), url).toBe(200);
    const extension = extname(file);
    const type = response.headers()["content-type"] ?? "";
    if (extension === ".js") expect(type, url).toMatch(/(?:java|ecma)script/);
    if (extension === ".css") expect(type, url).toMatch(/text\/css/);
    if (extension === ".svg") expect(type, url).toMatch(/image\/svg\+xml/);
    if (extension === ".html") expect(type, url).toMatch(/text\/html/);
    expect(Buffer.compare(await response.body(), readFileSync(file)), url).toBe(
      0,
    );
  }
});

test("production CRM routes, nested direct refresh and saved edits work", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`);
  });
  for (const [route, heading] of [
    ["/", "Overview"],
    ["/leads", "Leads"],
    ["/deals", "Sales pipeline"],
    ["/customers", "Customers"],
    ["/tasks", "Tasks"],
    ["/activities", "Activity timeline"],
  ]) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
    await expect(
      page.getByRole("heading", { level: 1, name: heading, exact: true }),
    ).toBeVisible();
    expect((await page.reload())?.status(), route).toBe(200);
    await expect(
      page.getByRole("heading", { level: 1, name: heading, exact: true }),
    ).toBeVisible();
  }
  const records = await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem("meridian-crm-v1")!);
    return ["leads", "customers", "deals", "tasks", "activities"].map(
      (domain) => ({
        domain,
        id: data[domain][0].id,
        name: data[domain][0].name,
      }),
    );
  });
  for (const record of records) {
    const route = `/${record.domain}/${record.id}`;
    expect((await page.goto(route))?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { level: 1, name: record.name, exact: true }),
    ).toBeVisible();
    expect((await page.reload())?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { level: 1, name: record.name, exact: true }),
    ).toBeVisible();
  }
  await page.goto("/leads");
  await page.getByRole("button", { name: "Add lead", exact: true }).click();
  await page.getByLabel("Name *").fill("Production persistence check");
  await page
    .getByRole("button", { name: "Create record", exact: true })
    .click();
  await page.reload();
  await page.getByLabel("Search leads").fill("Production persistence check");
  await expect(
    page.getByText("Production persistence check", { exact: true }),
  ).toBeVisible();
  await page
    .locator("nav")
    .getByRole("link", { name: "Customers", exact: true })
    .click();
  await expect(page).toHaveURL(/\/customers$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/leads$/);
  expect(errors).toEqual([]);
});

 test.beforeEach(async ({page})=>{await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('admin@meridian.demo');await page.getByLabel('Password',{exact:true}).fill('Meridian2026!');await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByRole('heading',{name:'Overview',exact:true})).toBeVisible();});
