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
- text: "[plugin:vite:css] [postcss] It looks like you're trying to use `tailwindcss` directly as a PostCSS plugin. The PostCSS plugin has moved to a separate package, so to continue using Tailwind CSS with PostCSS you'll need to install `@tailwindcss/postcss` and update your PostCSS configuration. D:/KnowledgeDump/src/App.css:undefined:null at ft (D:\\KnowledgeDump\\node_modules\\tailwindcss\\dist\\lib.js:38:1643) at LazyResult.runOnRoot (D:\\KnowledgeDump\\node_modules\\postcss\\lib\\lazy-result.js:361:16) at LazyResult.runAsync (D:\\KnowledgeDump\\node_modules\\postcss\\lib\\lazy-result.js:290:26) at LazyResult.async (D:\\KnowledgeDump\\node_modules\\postcss\\lib\\lazy-result.js:192:30) at LazyResult.then (D:\\KnowledgeDump\\node_modules\\postcss\\lib\\lazy-result.js:449:17) Click outside, press Esc key, or fix the code to dismiss. You can also disable this overlay by setting"
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