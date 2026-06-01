import { test, expect } from '@playwright/test';
import { login, goToMineSets } from './helpers/auth.js';

const uid = () => Date.now().toString(36);

/** Create a throwaway set and navigate to its DetailView. Returns the set title. */
async function createAndOpenSet(page) {
  const title = `PW_CardSet_${uid()}`;
  await page.locator('.sm-create-btn').click();
  await page.locator('input[placeholder="Titel eingeben"]').fill(title);
  await page.locator('button:has-text("Set erstellen")').click();
  await goToMineSets(page);
  await page.locator('.sm-card').filter({ hasText: title }).click();
  await expect(page.locator('h2').filter({ hasText: title })).toBeVisible({ timeout: 8000 });
  return title;
}

// ── Karten laden ──────────────────────────────────────────────────────────────

test('Karten werden in der Detailansicht geladen', async ({ page }) => {
  await login(page);
  await goToMineSets(page);

  const firstSet = page.locator('.sm-card').first();
  await firstSet.waitFor({ timeout: 10000 });
  await firstSet.click();

  // Card count label must appear.
  await expect(page.locator('p.sm-section-title')).toBeVisible({ timeout: 8000 });
});

// ── Karten erstellen ──────────────────────────────────────────────────────────

test.describe('Karten erstellen', () => {
  test('Neue Karte wird gespeichert und angezeigt', async ({ page }) => {
    await login(page);
    const setTitle = await createAndOpenSet(page);
    const question = `PW_Q_${uid()}`;
    const answer = `PW_A_${uid()}`;

    await page.locator('button:has-text("Karte hinzufügen")').click();
    await page.locator('input[placeholder="Frage..."]').fill(question);
    await page.locator('textarea[placeholder="Antwort..."]').fill(answer);
    await page.locator('button:has-text("Speichern")').first().click();

    await expect(page.locator('p').filter({ hasText: question })).toBeVisible({ timeout: 8000 });

    // Cleanup – delete the set.
    await page.locator('button:has-text("Set löschen")').click();
    await page.waitForTimeout(500);
  });
});

// ── Karten bearbeiten ─────────────────────────────────────────────────────────

test.describe('Karten bearbeiten', () => {
  test('Frage und Antwort können geändert werden', async ({ page }) => {
    await login(page);
    const setTitle = await createAndOpenSet(page);
    const originalQ = `PW_OrigQ_${uid()}`;
    const updatedQ = `PW_UpdQ_${uid()}`;

    // Create a card first.
    await page.locator('button:has-text("Karte hinzufügen")').click();
    await page.locator('input[placeholder="Frage..."]').fill(originalQ);
    await page.locator('textarea[placeholder="Antwort..."]').fill('Antwort');
    await page.locator('button:has-text("Speichern")').first().click();
    await expect(page.locator('p').filter({ hasText: originalQ })).toBeVisible({ timeout: 8000 });

    // Click the edit button (Sparkles icon) in the card row.
    const cardRow = page.locator('div').filter({ has: page.locator('p').filter({ hasText: originalQ }) }).last();
    await cardRow.locator('button.sm-btn-ghost').last().click();

    // The edit form appears with the existing question.
    await expect(page.locator('input[placeholder="Frage..."]')).toBeVisible({ timeout: 5000 });
    await page.locator('input[placeholder="Frage..."]').fill(updatedQ);
    await page.locator('button:has-text("Speichern")').first().click();

    await expect(page.locator('p').filter({ hasText: updatedQ })).toBeVisible({ timeout: 8000 });
    await expect(page.locator('p').filter({ hasText: originalQ })).not.toBeVisible();

    // Cleanup.
    await page.locator('button:has-text("Set löschen")').click();
    await page.waitForTimeout(500);
  });
});

// ── Karten löschen ────────────────────────────────────────────────────────────

test.describe('Karten löschen', () => {
  test('Gelöschte Karte verschwindet aus der Liste', async ({ page }) => {
    await login(page);
    const setTitle = await createAndOpenSet(page);
    const question = `PW_DelQ_${uid()}`;

    // Create a card.
    await page.locator('button:has-text("Karte hinzufügen")').click();
    await page.locator('input[placeholder="Frage..."]').fill(question);
    await page.locator('textarea[placeholder="Antwort..."]').fill('Antwort');
    await page.locator('button:has-text("Speichern")').first().click();
    await expect(page.locator('p').filter({ hasText: question })).toBeVisible({ timeout: 8000 });

    // Click the delete button (X icon) in the card row.
    const cardRow = page.locator('div').filter({ has: page.locator('p').filter({ hasText: question }) }).last();
    await cardRow.locator('button.sm-btn-danger').click();

    await expect(page.locator('p').filter({ hasText: question })).not.toBeVisible({ timeout: 5000 });

    // Cleanup.
    await page.locator('button:has-text("Set löschen")').click();
    await page.waitForTimeout(500);
  });
});
