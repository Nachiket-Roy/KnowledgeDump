# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.ts >> App should load and verify basic UI structure
- Location: e2e\app.spec.ts:3:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('h1')
Expected substring: "KnowledgeDump"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('h1')

```

```yaml
- text: "[plugin:vite:css] [postcss] tailwindcss: D:/KnowledgeDump/src/App.css:1:1: Cannot apply unknown utility class `bg-gray-900`. Are you using CSS modules or similar and missing `@reference`? https://tailwindcss.com/docs/functions-and-directives#reference-directive D:/KnowledgeDump/src/App.css:1:0 1 | @tailwind base; | ^ 2 | @tailwind components; 3 | @tailwind utilities; at Input.error (D:\\KnowledgeDump\\node_modules\\postcss\\lib\\input.js:135:16) at Root.error (D:\\KnowledgeDump\\node_modules\\postcss\\lib\\node.js:146:32) at Object.Once (D:\\KnowledgeDump\\node_modules\\@tailwindcss\\postcss\\dist\\index.js:10:6918) at async LazyResult.runAsync (D:\\KnowledgeDump\\node_modules\\postcss\\lib\\lazy-result.js:293:11) at async runPostCSS (file:///D:/KnowledgeDump/node_modules/vite/dist/node/chunks/config.js:30225:19) at async compilePostCSS (file:///D:/KnowledgeDump/node_modules/vite/dist/node/chunks/config.js:30209:6) at async compileCSS (file:///D:/KnowledgeDump/node_modules/vite/dist/node/chunks/config.js:30139:26) at async TransformPluginContext.handler (file:///D:/KnowledgeDump/node_modules/vite/dist/node/chunks/config.js:29672:54) at async EnvironmentPluginContainer.transform (file:///D:/KnowledgeDump/node_modules/vite/dist/node/chunks/config.js:28877:14) at async loadAndTransform (file:///D:/KnowledgeDump/node_modules/vite/dist/node/chunks/config.js:22746:26) at async viteTransformMiddleware (file:///D:/KnowledgeDump/node_modules/vite/dist/node/chunks/config.js:24622:20) Click outside, press Esc key, or fix the code to dismiss. You can also disable this overlay by setting"
- code: server.hmr.overlay
- text: to
- code: "false"
- text: in
- code: vite.config.ts
- text: .
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('App should load and verify basic UI structure', async ({ page }) => {
  4  |   // Since this is an E2E test running against the dev server port,
  5  |   // ensure you run `npm run dev` before running Playwright tests.
  6  |   await page.goto('http://localhost:1420');
  7  |   
  8  |   // Wait for the app shell to load
> 9  |   await expect(page.locator('h1')).toContainText('KnowledgeDump');
     |                                    ^ Error: expect(locator).toContainText(expected) failed
  10 |   
  11 |   // Check the sidebar for the new note button
  12 |   const newNoteBtn = page.locator('button:has(.lucide-plus)');
  13 |   await expect(newNoteBtn).toBeVisible();
  14 |   
  15 |   // Check search input visibility
  16 |   const searchInput = page.locator('input[placeholder="Search notes..."]');
  17 |   await expect(searchInput).toBeVisible();
  18 | });
  19 | 
```