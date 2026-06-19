import { test, expect } from '@playwright/test';

test('App should load and verify basic UI structure', async ({ page }) => {
  // Since this is an E2E test running against the dev server port,
  // ensure you run `npm run dev` before running Playwright tests.
  await page.goto('http://localhost:1420');
  
  // The sidebar is closed by default, so first wait for the tab bar toggle
  const toggleBtn = page.getByLabel('Toggle Sidebar');
  await expect(toggleBtn).toBeVisible();
  await toggleBtn.click();
  
  // Wait for the app shell to load
  await expect(page.locator('h1')).toContainText('KnowledgeDump');
  
  // Check the sidebar for the new note button
  const newNoteBtn = page.locator('button:has(.lucide-plus)');
  await expect(newNoteBtn).toBeVisible();
  
  // Verify the empty state renders (since backend note creation fails in standard browser tests)
  const emptyState = page.getByText('Select or create a note to begin editing.');
  await expect(emptyState).toBeVisible();
});
