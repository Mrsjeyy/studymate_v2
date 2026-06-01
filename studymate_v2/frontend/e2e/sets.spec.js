import { test, expect } from '@playwright/test';
import { login, goToMineSets, goToDiscover } from './helpers/auth.js';

const uid = () => Date.now().toString(36);

// ── Supabase-Verbindung ───────────────────────────────────────────────────────

test('Öffentliche Sets werden aus Supabase geladen', async ({ page }) => {
  await login(page);
  // At least one public set must appear in the Discover tab.
  await goToDiscover(page);
  await expect(page.locator('.sm-card').first()).toBeVisible({ timeout: 10000 });
});

// ── Set erstellen ─────────────────────────────────────────────────────────────

test.describe('Lernset erstellen', () => {
  test('Neues Set erscheint in "Meine Sets"', async ({ page }) => {
    const title = `PW_Set_${uid()}`;
    await login(page);

    await page.locator('.sm-create-btn').click();
    await page.locator('input[placeholder="Titel eingeben"]').fill(title);
    await page.locator('button:has-text("Set erstellen")').click();

    await goToMineSets(page);
    await expect(page.locator('.sm-card').filter({ hasText: title })).toBeVisible({ timeout: 10000 });

    // Cleanup – open the set and delete it.
    await page.locator('.sm-card').filter({ hasText: title }).click();
    await page.locator('button:has-text("Set löschen")').click();
    await page.waitForTimeout(500);
  });

  test('Fehlermeldung bei leerem Titel', async ({ page }) => {
    await login(page);
    await page.locator('.sm-create-btn').click();
    await page.locator('button:has-text("Set erstellen")').click();
    await expect(page.locator('.sm-modal-error')).toBeVisible();
  });
});

// ── Lernset bearbeiten ────────────────────────────────────────────────────────

test.describe('Lernset bearbeiten', () => {
  test('Titel und Beschreibung können geändert werden', async ({ page }) => {
    const original = `PW_EditSet_${uid()}`;
    const updated = `PW_EditSet_upd_${uid()}`;
    await login(page);

    // Create a set.
    await page.locator('.sm-create-btn').click();
    await page.locator('input[placeholder="Titel eingeben"]').fill(original);
    await page.locator('button:has-text("Set erstellen")').click();

    // Open it.
    await goToMineSets(page);
    await page.locator('.sm-card').filter({ hasText: original }).click();

    // Open the title edit form.
    await page.locator('button[title="Titel bearbeiten"]').click();
    await page.locator('input[placeholder="Titel..."]').fill(updated);
    await page.locator('button:has-text("Speichern")').first().click();

    await expect(page.locator('h2').filter({ hasText: updated })).toBeVisible({ timeout: 8000 });

    // Cleanup.
    await page.locator('button:has-text("Set löschen")').click();
    await page.waitForTimeout(500);
  });
});

// ── Private Lernsets ──────────────────────────────────────────────────────────

test.describe('Private Lernsets', () => {
  test('Neu erstelltes Set ist standardmäßig privat', async ({ page }) => {
    const title = `PW_PrivateSet_${uid()}`;
    await login(page);

    await page.locator('.sm-create-btn').click();
    await page.locator('input[placeholder="Titel eingeben"]').fill(title);
    // Do NOT click "Öffentlich" – default is private.
    await page.locator('button:has-text("Set erstellen")').click();

    await goToMineSets(page);
    const card = page.locator('.sm-card').filter({ hasText: title });
    await expect(card).toBeVisible({ timeout: 10000 });
    // The "Privat" badge must be present inside the card.
    await expect(card.locator('.sm-badge-private')).toBeVisible();

    // Cleanup.
    await card.click();
    await page.locator('button:has-text("Set löschen")').click();
    await page.waitForTimeout(500);
  });

  test('Privates Set erscheint nicht in "Entdecken"', async ({ page }) => {
    const title = `PW_PrivateSet_${uid()}`;
    await login(page);

    await page.locator('.sm-create-btn').click();
    await page.locator('input[placeholder="Titel eingeben"]').fill(title);
    await page.locator('button:has-text("Set erstellen")').click();

    await goToDiscover(page);
    await page.locator('input[placeholder*="öffentlichen Sets suchen"]').fill(title);
    await page.waitForTimeout(1000);
    await expect(page.locator('.sm-card').filter({ hasText: title })).not.toBeVisible();

    // Cleanup.
    await goToMineSets(page);
    await page.locator('input[placeholder*="Sets suchen"]').fill(title);
    await page.waitForTimeout(500);
    await page.locator('.sm-card').filter({ hasText: title }).click();
    await page.locator('button:has-text("Set löschen")').click();
    await page.waitForTimeout(500);
  });
});

// ── Lernset löschen ───────────────────────────────────────────────────────────

test.describe('Lernset löschen', () => {
  test('Gelöschtes Set verschwindet aus "Meine Sets"', async ({ page }) => {
    const title = `PW_DelSet_${uid()}`;
    await login(page);

    await page.locator('.sm-create-btn').click();
    await page.locator('input[placeholder="Titel eingeben"]').fill(title);
    await page.locator('button:has-text("Set erstellen")').click();

    await goToMineSets(page);
    await page.locator('.sm-card').filter({ hasText: title }).click();
    await page.locator('button:has-text("Set löschen")').click();

    await goToMineSets(page);
    await page.locator('input[placeholder*="Sets suchen"]').fill(title);
    await page.waitForTimeout(800);
    await expect(page.locator('.sm-card').filter({ hasText: title })).not.toBeVisible();
  });
});
