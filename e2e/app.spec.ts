import { test, expect } from '@playwright/test';

test('App should load and verify basic UI structure', async ({ page }) => {
  // Since this is an E2E test running against the dev server port,
  // ensure you run `npm run dev` before running Playwright tests.
  await page.goto('http://localhost:1420');
  
  // Wait for the app shell to load
  await expect(page.locator('h1')).toContainText('KnowledgeDump');
  
  // Check the sidebar for the new note button
  const newNoteBtn = page.locator('button:has(.lucide-plus)');
  await expect(newNoteBtn).toBeVisible();
  
  // Check search input visibility
  const searchInput = page.locator('input[placeholder="Search notes..."]');
  await expect(searchInput).toBeVisible();
});
