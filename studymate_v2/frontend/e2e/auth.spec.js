import { test, expect } from '@playwright/test';
import { login, logout, skipTour, goToAuthForm, TEST_USERNAME, TEST_PASSWORD } from './helpers/auth.js';

// ── Login testen ──────────────────────────────────────────────────────────────

test.describe('Login', () => {
  test('Erfolgreich mit gültigen Zugangsdaten', async ({ page }) => {
    await login(page);
    await expect(page.locator('.sm-create-btn')).toBeVisible();
  });

  test('Fehlermeldung bei falschem Passwort', async ({ page }) => {
    await goToAuthForm(page);
    await page.locator('input[placeholder="dein_username"]').fill(TEST_USERNAME);
    await page.locator('input[type="password"]').fill('falsches_passwort');
    await page.locator('button.sm-btn-primary').click();

    const error = page.locator('div').filter({ hasText: 'Benutzername oder Passwort falsch' }).first();
    await expect(error).toBeVisible({ timeout: 8000 });
  });

  test('Fehlermeldung bei leeren Feldern', async ({ page }) => {
    await goToAuthForm(page);
    await page.locator('button.sm-btn-primary').click();

    const error = page.locator('div').filter({ hasText: 'Bitte alle Felder ausfüllen' }).first();
    await expect(error).toBeVisible();
  });
});

// ── Logout testen ─────────────────────────────────────────────────────────────

test.describe('Logout', () => {
  test('Session wird korrekt beendet', async ({ page }) => {
    await login(page);
    await logout(page);

    // After logout the app shows the auth form.
    await expect(page.locator('input[placeholder="dein_username"]')).toBeVisible();
    await expect(page.locator('.sm-create-btn')).not.toBeVisible();
  });
});

// ── Gastansicht testen ────────────────────────────────────────────────────────

test.describe('Gastansicht', () => {
  test('Gast kann öffentliche Sets sehen', async ({ page }) => {
    // App starts in guest mode by default – no extra click needed.
    await skipTour(page);
    await page.goto('/');
    await expect(page.locator('.sm-card').first()).toBeVisible({ timeout: 10000 });
  });

  test('Gast sieht keinen "Neues Set"-Button', async ({ page }) => {
    await skipTour(page);
    await page.goto('/');
    await page.locator('.sm-card').first().waitFor({ timeout: 10000 });

    await expect(page.locator('.sm-create-btn')).not.toBeVisible();
  });

  test('Gast sieht keinen Fork-Button', async ({ page }) => {
    await skipTour(page);
    await page.goto('/');
    await page.locator('.sm-card').first().waitFor({ timeout: 10000 });

    await expect(page.locator('.fork-btn').first()).not.toBeVisible();
  });
});
