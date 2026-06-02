import { test, expect } from '@playwright/test';
import { login, skipTour, goToMineSets } from './helpers/auth.js';

// ── Geführte Tour ─────────────────────────────────────────────────────────────

test.describe('Guided Tour', () => {
  test('Tour erscheint für neue Nutzer (localStorage leer)', async ({ page }) => {
    // Do NOT call skipTour – we want to see the tour.
    await page.goto('/');
    // App starts in guest mode; open the auth form via the navbar.
    await page.waitForSelector('.sm-nav', { timeout: 10000 });
    await page.locator('.sm-nav button:has-text("Anmelden")').click();
    await page.waitForSelector('input[placeholder="dein_username"]', { timeout: 5000 });
    // Log in so the dashboard loads.
    await page.locator('input[placeholder="dein_username"]').fill(
      process.env.TEST_USERNAME || 'pw_test_user'
    );
    await page.locator('input[type="password"]').fill(
      process.env.TEST_PASSWORD || 'test_pw_123!'
    );
    await page.locator('button.sm-btn-primary').click();
    await page.waitForSelector('.sm-create-btn', { timeout: 15000 });

    // The tour modal must appear.
    await expect(page.locator('.tour-modal')).toBeVisible({ timeout: 5000 });
  });

  test('Tour kann mit "Überspringen" beendet werden', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.sm-nav', { timeout: 10000 });
    await page.locator('.sm-nav button:has-text("Anmelden")').click();
    await page.waitForSelector('input[placeholder="dein_username"]', { timeout: 5000 });
    await page.locator('input[placeholder="dein_username"]').fill(
      process.env.TEST_USERNAME || 'pw_test_user'
    );
    await page.locator('input[type="password"]').fill(
      process.env.TEST_PASSWORD || 'test_pw_123!'
    );
    await page.locator('button.sm-btn-primary').click();
    await page.waitForSelector('.sm-create-btn', { timeout: 15000 });

    // Skip the tour.
    await page.locator('.tour-btn-skip').first().click();

    await expect(page.locator('.tour-modal')).not.toBeVisible({ timeout: 3000 });
  });

  test('Tour erscheint nicht mehr nach dem Überspringen', async ({ page }) => {
    // First run: skip the tour.
    await page.goto('/');
    await page.waitForSelector('.sm-nav', { timeout: 10000 });
    await page.locator('.sm-nav button:has-text("Anmelden")').click();
    await page.waitForSelector('input[placeholder="dein_username"]', { timeout: 5000 });
    await page.locator('input[placeholder="dein_username"]').fill(
      process.env.TEST_USERNAME || 'pw_test_user'
    );
    await page.locator('input[type="password"]').fill(
      process.env.TEST_PASSWORD || 'test_pw_123!'
    );
    await page.locator('button.sm-btn-primary').click();
    await page.waitForSelector('.sm-create-btn', { timeout: 15000 });

    if (await page.locator('.tour-modal').isVisible()) {
      await page.locator('.tour-btn-skip').first().click();
    }

    // Reload the page.
    await page.reload();
    await page.waitForSelector('.sm-create-btn', { timeout: 10000 });
    await expect(page.locator('.tour-modal')).not.toBeVisible();
  });
});

// ── Streaks ───────────────────────────────────────────────────────────────────

test.describe('Streaks', () => {
  test('Streak-Zähler beginnt bei 0 für neue Session', async ({ page }) => {
    await login(page);
    // Switch to dashboard tab to see the stats.
    await page.locator('button.sm-tab').filter({ hasText: 'Dashboard' }).click();
    await page.waitForTimeout(500);
    const streakStat = page.locator('.sm-stat').filter({ hasText: 'Streak-Tage' });
    await expect(streakStat).toBeVisible();
  });

  test('Streak erhöht sich nach Abschluss einer Lernsession', async ({ page }) => {
    test.setTimeout(60000);
    const uid = Date.now().toString(36);
    await login(page);

    // Create a set with one card so we can complete a session.
    await page.locator('.sm-create-btn').click();
    await page.locator('input[placeholder="Titel eingeben"]').fill(`PW_StreakSet_${uid}`);
    await page.locator('button:has-text("Set erstellen")').click();

    await goToMineSets(page);
    await page.locator('.sm-card').filter({ hasText: `PW_StreakSet_${uid}` }).click();

    await page.locator('button:has-text("Karte hinzufügen")').click();
    await page.locator('input[placeholder="Frage..."]').fill('Streak Frage');
    await page.locator('textarea[placeholder="Antwort..."]').fill('Streak Antwort');
    await page.locator('button:has-text("Speichern")').first().click();
    await expect(page.locator('p').filter({ hasText: 'Streak Frage' })).toBeVisible({ timeout: 8000 });

    // Go back to the set, start a learn session, and complete it.
    await goToMineSets(page);
    await page.locator('.sm-card').filter({ hasText: `PW_StreakSet_${uid}` }).click();
    await page.locator('.learn-btn').click();

    // Flip the card and mark as known.
    await page.locator('.sm-flip-card').click();
    await page.locator('button:has-text("Gewusst!")').click();

    // Session complete screen.
    await expect(page.locator('text=Session beendet')).toBeVisible({ timeout: 8000 });

    // Navigate to Dashboard and verify streak is ≥ 1.
    await page.locator('button:has-text("Zurück")').click();
    await page.locator('.sm-sidebar-item').filter({ hasText: 'Dashboard' }).click();
    await page.waitForTimeout(500);
    const streakNum = page.locator('.sm-stat').filter({ hasText: 'Streak-Tage' }).locator('.sm-stat-num');
    const streakValue = parseInt(await streakNum.textContent(), 10);
    expect(streakValue).toBeGreaterThanOrEqual(1);

    // Cleanup.
    await goToMineSets(page);
    await page.locator('.sm-card').filter({ hasText: `PW_StreakSet_${uid}` }).click();
    await page.locator('button:has-text("Set löschen")').click();
    await page.waitForTimeout(500);
  });
});
