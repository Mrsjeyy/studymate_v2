import { test, expect } from '@playwright/test';
import { login, skipTour } from './helpers/auth.js';

// All tests in this file run on the Mobile Chrome project (Pixel 5 viewport).

test.describe('Mobile Ansicht', () => {
  test('App lädt korrekt auf mobiler Auflösung', async ({ page }) => {
    await skipTour(page);
    await page.goto('/');
    // The main wrapper must be present.
    await expect(page.locator('.sm')).toBeVisible();
  });

  test('Sidebar öffnet sich über das Hamburger-Menü', async ({ page }) => {
    await login(page);
    // The sidebar is hidden on mobile by default.
    const sidebar = page.locator('.sm-sidebar');
    await expect(sidebar).not.toHaveClass(/mobile-open/);

    // Click the hamburger button.
    await page.locator('button[aria-label="Menü öffnen"], button:has(svg[data-lucide="menu"])').first().click();
    await expect(sidebar).toHaveClass(/mobile-open/, { timeout: 3000 });
  });

  test('Set-Cards passen sich an schmale Bildschirme an', async ({ page }) => {
    await skipTour(page);
    await page.goto('/');
    // App auto-starts in guest/discover mode — no need to click "Als Gast fortfahren".
    await page.locator('.sm-card').first().waitFor({ timeout: 10000 });

    // No horizontal scroll should be needed (cards should wrap).
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5); // allow 5 px tolerance
  });
});
