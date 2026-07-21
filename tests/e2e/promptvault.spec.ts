import { expect, test } from "@playwright/test";

async function createPrompt(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("link", { name: "新建 Prompt" }).first().click();
  await page.getByPlaceholder("Prompt 标题").fill("Browser prompt");
  await page.getByLabel("内容").fill("Hello {{name}}");
  await page.getByLabel("文件夹").fill("Tests");
  await page.getByLabel("标签").fill("browser, smoke");
  await page.getByRole("button", { name: "保存" }).click();
  await expect(page).toHaveURL(/#\/p\//);
}

test("creates, versions, restores, and persists a prompt", async ({ page }) => {
  await createPrompt(page);
  await expect(page.getByText("Browser prompt", { exact: true }).first()).toBeVisible();
  await page.getByLabel("内容").fill("Updated {{name}}");
  await page.getByRole("button", { name: "保存" }).click();
  await expect(page.getByText("1 个版本")).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("内容")).toHaveValue("Updated {{name}}");
  await page.getByRole("button", { name: /v1/ }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "恢复此版本" }).click();
  await expect(page.getByLabel("内容")).toHaveValue("Hello {{name}}");

  await page.getByRole("button", { name: "填参 (1)" }).click();
  await page.getByPlaceholder("输入 name…").fill("Ayaya");
  await expect(page.getByText("Hello Ayaya", { exact: true })).toBeVisible();
});

test("stores session settings and runs the browser playground", async ({ page }) => {
  await createPrompt(page);
  await page.getByRole("link", { name: "设置" }).click();
  await page.getByRole("button", { name: "OpenRouter" }).click();
  await page.getByRole("textbox", { name: "API Key", exact: true }).fill("test-browser-key");
  await page.getByRole("button", { name: "保存设置" }).click();
  await expect(page.getByRole("button", { name: "已保存" })).toBeVisible();

  const postBody = new Promise<Record<string, unknown>>((resolve) => {
    void page.route("**/chat/completions", async (route) => {
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" } });
        return;
      }
      resolve(route.request().postDataJSON() as Record<string, unknown>);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({
          choices: [{ message: { content: "Mock provider answer" } }],
          usage: { prompt_tokens: 4, completion_tokens: 3 },
        }),
      });
    });
  });

  await page.getByRole("link", { name: "Playground" }).click();
  await page.getByLabel("{{name}}").fill("Codex");
  await page.getByRole("button", { name: "运行" }).click();
  await expect(page.getByText("Mock provider answer", { exact: true }).first()).toBeVisible();
  const body = await postBody;
  expect(body).toMatchObject({ model: "anthropic/claude-sonnet-4.5" });
});

test("opens the responsive navigation on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "打开导航" }).click();
  await expect(page.getByRole("link", { name: "新建 Prompt" }).first()).toBeVisible();
  await page.getByRole("button", { name: "关闭导航" }).click();
  await expect(page.getByRole("button", { name: "打开导航" })).toBeVisible();
});
