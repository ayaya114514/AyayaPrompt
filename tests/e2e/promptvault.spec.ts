import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function openApp(page: Page, hash = "") {
  return page.goto(hash ? `./#${hash}` : "./");
}

async function createPrompt(
  page: Page,
  {
    title = "Browser prompt",
    content = "Hello {{name}}",
  }: { title?: string; content?: string } = {},
) {
  await openApp(page);
  await page.getByRole("link", { name: "新建 Prompt" }).first().click();
  await page.getByLabel("内容", { exact: true }).fill(content);
  await page.getByLabel("文件夹", { exact: true }).fill("Tests");
  await page.getByLabel("标签", { exact: true }).fill("browser, smoke");
  const titleInput = page.getByPlaceholder("Prompt 标题");
  await titleInput.fill(title);
  await expect(titleInput).toHaveValue(title);
  await page.getByRole("button", { name: "保存" }).click();
  await expect(page).toHaveURL(/#\/p\//);
}

async function configureOpenRouter(page: Page) {
  await page.getByRole("link", { name: "设置" }).click();
  await page.getByRole("button", { name: "OpenRouter" }).click();
  await page.getByRole("textbox", { name: "API Key", exact: true }).fill("test-browser-key");
  await page.getByRole("button", { name: "保存设置" }).click();
  await expect(page.getByRole("button", { name: "已保存" })).toBeVisible();
}

async function expectNoAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();

  expect(
    results.violations.map(({ help, id, impact, nodes }) => ({
      help,
      id,
      impact,
      targets: nodes.map((node) => node.target),
    })),
  ).toEqual([]);
}

async function dismissDialogFrom(
  page: Page,
  action: () => Promise<unknown>,
): Promise<string> {
  const dialogPromise = page.waitForEvent("dialog");
  const actionPromise = action();
  const dialog = await dialogPromise;
  const message = dialog.message();
  await dialog.dismiss();
  await actionPromise;
  return message;
}

async function dispatchPrimaryNewShortcut(target: ReturnType<Page["locator"]>) {
  await target.evaluate((element) => {
    const applePlatform = /Mac|iPhone|iPad|iPod/i.test(
      navigator.platform || navigator.userAgent,
    );
    element.dispatchEvent(new KeyboardEvent("keydown", {
      key: "n",
      metaKey: applePlatform,
      ctrlKey: !applePlatform,
      bubbles: true,
      cancelable: true,
    }));
  });
}

test("serves the production bundle from the Pages project path", async ({ page, request }) => {
  const documentResponse = await openApp(page, "/settings");
  expect(documentResponse?.status()).toBe(200);
  expect(new URL(page.url()).pathname).toBe("/AyayaPrompt/");
  expect(new URL(page.url()).hash).toBe("#/settings");
  await expect(page.getByRole("heading", { name: "API 设置" })).toBeVisible();
  await expect(page.locator('script[src*="/@vite/client"]')).toHaveCount(0);

  const assetPaths = await page
    .locator('script[type="module"][src], link[rel="stylesheet"][href]')
    .evaluateAll((elements) =>
      elements.map((element) => {
        const value = element.getAttribute("src") ?? element.getAttribute("href") ?? "";
        return new URL(value, document.baseURI).pathname;
      }),
    );
  expect(assetPaths.length).toBeGreaterThan(0);
  expect(assetPaths.every((assetPath) => assetPath.startsWith("/AyayaPrompt/assets/"))).toBe(true);

  const assetResponse = await request.get(`http://127.0.0.1:4173${assetPaths[0]}`);
  expect(assetResponse.ok()).toBe(true);
  const rootResponse = await request.get("http://127.0.0.1:4173/");
  expect(rootResponse.status()).toBe(404);
});

test("creates, versions, restores, and persists a prompt", async ({ page }) => {
  await createPrompt(page);
  await expect(page.getByText("Browser prompt", { exact: true }).first()).toBeVisible();
  await page.getByLabel("内容", { exact: true }).fill("Updated {{name}}");
  await page.getByRole("button", { name: "保存" }).click();
  await expect(page.getByText("1 个版本")).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("内容", { exact: true })).toHaveValue("Updated {{name}}");
  await page.getByRole("button", { name: /v1/ }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "恢复此版本" }).click();
  await expect(page.getByLabel("内容", { exact: true })).toHaveValue("Hello {{name}}");

  await page.getByRole("button", { name: "填参 (1)" }).click();
  await page.getByPlaceholder("输入 name…").fill("Ayaya");
  await expect(page.getByText("Hello Ayaya", { exact: true })).toBeVisible();
});

test("keeps an editable draft when the new-prompt shortcut is pressed", async ({ page }) => {
  await openApp(page, "/new");
  const title = page.getByPlaceholder("Prompt 标题");
  const content = page.getByLabel("内容", { exact: true });
  await title.fill("Unsaved title");
  await content.fill("Unsaved body");

  await content.press("Control+n");

  await expect(page).toHaveURL(/#\/new$/);
  await expect(title).toHaveValue("Unsaved title");
  await expect(content).toHaveValue("Unsaved body");
});

test("asks before the new-prompt shortcut leaves a dirty form", async ({ page }) => {
  await createPrompt(page);
  const promptUrl = page.url();
  const content = page.getByLabel("内容", { exact: true });
  await content.fill("Dirty shortcut draft");
  await expect(page.locator('form[data-dirty="true"]')).toBeVisible();

  const dialogMessage = await dismissDialogFrom(
    page,
    () => dispatchPrimaryNewShortcut(page.locator("main")),
  );

  expect(dialogMessage).toContain("尚未保存");
  await expect(page).toHaveURL(promptUrl);
  await expect(content).toHaveValue("Dirty shortcut draft");
});

test("keeps a dirty edit when browser-back discard is cancelled", async ({ page }) => {
  await createPrompt(page);
  const promptUrl = page.url();
  const content = page.getByLabel("内容", { exact: true });
  await content.fill("Unsaved browser-back draft");
  await expect(page.locator('form[data-dirty="true"]')).toBeVisible();

  const dialogMessage = await dismissDialogFrom(
    page,
    () => page.evaluate(() => window.history.back()),
  );
  expect(dialogMessage).toContain("尚未保存");

  await expect(page).toHaveURL(promptUrl);
  await expect(content).toHaveValue("Unsaved browser-back draft");
});

test("adopts a remote update while the local form is clean", async ({ page }) => {
  await createPrompt(page);
  const promptUrl = page.url();
  const remotePage = await page.context().newPage();
  await remotePage.goto(promptUrl);

  await remotePage.getByLabel("内容", { exact: true }).fill("Updated in remote tab");
  await remotePage.getByRole("button", { name: "保存", exact: true }).click();

  await expect(page.getByLabel("内容", { exact: true })).toHaveValue("Updated in remote tab");
  await expect(page.getByText(/另一个标签页中更新/)).toHaveCount(0);
  await remotePage.close();
});

test("preserves a dirty draft and reports a remote update conflict", async ({ page }) => {
  await createPrompt(page);
  const promptUrl = page.url();
  const remotePage = await page.context().newPage();
  await remotePage.goto(promptUrl);
  const localContent = page.getByLabel("内容", { exact: true });
  await localContent.fill("Local unsaved draft");

  await remotePage.getByLabel("内容", { exact: true }).fill("Remote saved value");
  await remotePage.getByRole("button", { name: "保存", exact: true }).click();

  await expect(page.getByText(/另一个标签页中更新.*草稿已保留/)).toBeVisible();
  await expect(localContent).toHaveValue("Local unsaved draft");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("请复制你的草稿并刷新后再合并");
  await expect(page).toHaveURL(promptUrl);
  await expect(localContent).toHaveValue("Local unsaved draft");
  await remotePage.close();
});

test("recovers a dirty draft as a new prompt after remote deletion", async ({ page }) => {
  await createPrompt(page);
  const originalPromptUrl = page.url();
  const remotePage = await page.context().newPage();
  await remotePage.goto(originalPromptUrl);
  const localTitle = page.getByPlaceholder("Prompt 标题");
  const localContent = page.getByLabel("内容", { exact: true });
  await localTitle.fill("Recovered prompt");
  await localContent.fill("Draft survives remote deletion");

  remotePage.once("dialog", (dialog) => dialog.accept());
  await remotePage.getByRole("button", { name: "删除", exact: true }).click();
  await expect(remotePage).toHaveURL(/#\/$/);

  await expect(page.getByText(/另一个标签页中删除.*草稿已保留/)).toBeVisible();
  await expect(localContent).toHaveValue("Draft survives remote deletion");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect.poll(() => page.url()).not.toBe(originalPromptUrl);
  await expect(page).toHaveURL(/#\/p\//);
  await expect(localTitle).toHaveValue("Recovered prompt");
  await expect(localContent).toHaveValue("Draft survives remote deletion");

  await page.reload();
  await expect(page.getByLabel("内容", { exact: true })).toHaveValue("Draft survives remote deletion");
  await remotePage.close();
});

test("clears an entered API key when the provider endpoint changes", async ({ page }) => {
  await openApp(page, "/settings");
  const apiKey = page.getByRole("textbox", { name: "API Key", exact: true });
  await apiKey.fill("anthropic-secret");

  await page.getByRole("button", { name: "Groq" }).click();

  await expect(apiKey).toHaveValue("");
});

test("preserves unsaved settings when navigation is cancelled", async ({ page }) => {
  await openApp(page, "/settings");
  const apiKey = page.getByRole("textbox", { name: "API Key", exact: true });
  await apiKey.fill("unsaved-test-key");
  await expect(page.locator('form[data-dirty="true"]')).toBeVisible();

  const dialogMessage = await dismissDialogFrom(
    page,
    () => page.getByRole("link", { name: "Playground", exact: true }).click(),
  );

  expect(dialogMessage).toContain("尚未保存");
  await expect(page).toHaveURL(/#\/settings$/);
  await expect(apiKey).toHaveValue("unsaved-test-key");
});

test("does not overwrite a dirty settings draft after a remote save", async ({ page }) => {
  await openApp(page, "/settings");
  const remotePage = await page.context().newPage();
  await remotePage.goto(page.url());
  const localModel = page.getByLabel("模型", { exact: true });
  await localModel.fill("local-unsaved-model");

  await remotePage.getByLabel("模型", { exact: true }).fill("remote-saved-model");
  await remotePage.getByRole("button", { name: "保存设置" }).click();
  await expect(remotePage.getByRole("button", { name: "已保存" })).toBeVisible();

  await expect(localModel).toHaveValue("local-unsaved-model");
  await expect(page.getByText(/设置已在另一个标签页中更新.*草稿已保留/)).toBeVisible();
  let overwriteDialog = "";
  page.once("dialog", async (dialog) => {
    overwriteDialog = dialog.message();
    await dialog.dismiss();
  });
  await page.getByRole("button", { name: "保存设置" }).click();
  expect(overwriteDialog).toContain("覆盖");
  await expect(localModel).toHaveValue("local-unsaved-model");
  await remotePage.close();
});

test("stores session settings and runs the browser playground", async ({ page }) => {
  await createPrompt(page);
  await configureOpenRouter(page);

  const postBody = new Promise<Record<string, unknown>>((resolve) => {
    void page.route("**/chat/completions", async (route) => {
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "POST",
            "access-control-allow-headers": "authorization, content-type",
          },
        });
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
  await page.getByRole("button", { name: "运行", exact: true }).click();
  await expect(page.getByText("Mock provider answer", { exact: true }).first()).toBeVisible();
  const body = await postBody;
  expect(body).toMatchObject({ model: "anthropic/claude-sonnet-4.5" });

  const deleteRunButton = page.getByRole("button", { name: /删除/ });
  await expect(deleteRunButton).toHaveCount(1);
  await expect(deleteRunButton).toBeVisible();
});

test("does not show a delayed result after switching prompts", async ({ page }) => {
  await createPrompt(page, { title: "First prompt", content: "First body" });
  await createPrompt(page, { title: "Second prompt", content: "Second body" });
  await configureOpenRouter(page);
  await page.getByRole("link", { name: "Playground" }).click();

  const promptSelect = page.getByLabel("选择 Prompt", { exact: true });
  let releaseResponse!: () => void;
  const responseGate = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });
  let markStarted!: () => void;
  const requestStarted = new Promise<void>((resolve) => {
    markStarted = resolve;
  });
  let markDelivered!: () => void;
  const responseDelivered = new Promise<void>((resolve) => {
    markDelivered = resolve;
  });

  let requestNumber = 0;
  await page.route("**/chat/completions", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "POST",
          "access-control-allow-headers": "authorization, content-type",
        },
      });
      return;
    }
    requestNumber += 1;
    if (requestNumber === 1) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({ choices: [{ message: { content: "Initial provider answer" } }] }),
      });
      return;
    }
    markStarted();
    await responseGate;
    try {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({ choices: [{ message: { content: "Stale provider answer" } }] }),
      });
    } catch {
      // Loading a history item aborts the pending request before it can be fulfilled.
    } finally {
      markDelivered();
    }
  });

  await promptSelect.selectOption({ label: "Second prompt" });
  await page.getByRole("button", { name: "运行", exact: true }).click();
  await expect(page.getByText("Initial provider answer", { exact: true }).first()).toBeVisible();

  await promptSelect.selectOption({ label: "First prompt" });
  await page.getByRole("button", { name: "运行", exact: true }).click();
  await requestStarted;
  await expect(promptSelect).toBeDisabled();
  await page.getByRole("button", { name: "将 Second prompt 回填到 Playground" }).click();
  await expect(page.getByText("Second body", { exact: true })).toBeVisible();
  releaseResponse();
  await responseDelivered;

  await expect(page.getByRole("button", { name: "运行", exact: true })).toBeEnabled();
  await expect(page.getByText("Stale provider answer", { exact: true })).toHaveCount(0);
});

test("uses modal focus behavior for responsive navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openApp(page);
  const openButton = page.getByRole("button", { name: "打开导航" });
  const drawer = page.getByRole("dialog");

  await expect(drawer).toBeHidden();
  await openButton.click();
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("link", { name: "新建 Prompt" })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null))
    .toBe(true);

  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(openButton).toBeFocused();
});

test("passes automated accessibility smoke on home and mobile navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openApp(page);
  await expectNoAccessibilityViolations(page);

  await page.getByRole("button", { name: "打开导航" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expectNoAccessibilityViolations(page);
});
