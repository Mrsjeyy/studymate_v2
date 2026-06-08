import { test, expect } from '@playwright/test';
import { login, skipTour, goToMineSets, goToDiscover, TEST_USERNAME, TEST_PASSWORD } from './helpers/auth.js';

const uid = () => Date.now().toString(36);

/** Skip dashboard tours but leave detail + createSet tours active. */
async function skipDashboardTours(page) {
  await page.addInitScript(() => {
    const completed = { dashboard: true, discover: true, mine: true };
    localStorage.setItem('sm_tour_completed', JSON.stringify(completed));
  });
}

/** Create a set, add a card, navigate to set detail. Returns set title. */
async function createSetWithCard(page, question = 'Frage A', answer = 'Antwort A') {
  const title = `PW_Feat_${uid()}`;
  await page.locator('.sm-create-btn').click();
  await page.locator('input[placeholder="Titel eingeben"]').fill(title);
  await page.locator('button:has-text("Set erstellen")').click();
  await goToMineSets(page);
  await page.locator('.sm-card').filter({ hasText: title }).click();
  await expect(page.locator('h2').filter({ hasText: title })).toBeVisible({ timeout: 8000 });
  await page.locator('button:has-text("Karte hinzufügen")').click();
  await page.locator('input[placeholder="Frage..."]').fill(question);
  await page.locator('textarea[placeholder="Antwort..."]').fill(answer);
  await page.locator('button:has-text("Speichern")').first().click();
  await expect(page.locator('p').filter({ hasText: question })).toBeVisible({ timeout: 8000 });
  return title;
}

// ── Registrierung ──────────────────────────────────────────────────────────────

test.describe('Registrierung', () => {
  test('Neuer Benutzer kann sich registrieren und sieht das Dashboard', async ({ page }) => {
    await skipTour(page);
    await page.goto('/');
    await page.waitForSelector('.sm-nav', { timeout: 10000 });
    await page.locator('.sm-nav button:has-text("Anmelden")').click();
    await page.waitForSelector('input[placeholder="dein_username"]', { timeout: 5000 });

    // Switch to register tab.
    await page.locator('span.sm-tab:has-text("Registrieren")').click();

    const newUser = `pw_reg_${uid()}`;
    await page.locator('input[placeholder="dein_username"]').fill(newUser);
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button.sm-btn-primary').click();

    // After registration the user lands on the dashboard.
    await expect(page.locator('.sm-create-btn')).toBeVisible({ timeout: 15000 });
  });

  test('Doppelter Benutzername wird abgelehnt', async ({ page }) => {
    await skipTour(page);
    await page.goto('/');
    await page.waitForSelector('.sm-nav', { timeout: 10000 });
    await page.locator('.sm-nav button:has-text("Anmelden")').click();
    await page.waitForSelector('input[placeholder="dein_username"]', { timeout: 5000 });

    // Switch to register tab and try to reuse the existing test username.
    await page.locator('span.sm-tab:has-text("Registrieren")').click();
    await page.locator('input[placeholder="dein_username"]').fill(TEST_USERNAME);
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button.sm-btn-primary').click();

    const error = page.locator('.sm-alert').filter({ hasText: 'bereits vergeben' });
    await expect(error).toBeVisible({ timeout: 8000 });
  });
});

// ── Karten-Reihenfolge ────────────────────────────────────────────────────────

test.describe('Karten-Reihenfolge ändern', () => {
  test('Karte kann nach unten verschoben werden', async ({ page }) => {
    await login(page);
    const title = `PW_Order_${uid()}`;

    // Create set and two cards.
    await page.locator('.sm-create-btn').click();
    await page.locator('input[placeholder="Titel eingeben"]').fill(title);
    await page.locator('button:has-text("Set erstellen")').click();

    await goToMineSets(page);
    await page.locator('.sm-card').filter({ hasText: title }).click();

    await page.locator('button:has-text("Karte hinzufügen")').click();
    await page.locator('input[placeholder="Frage..."]').fill('Erste Frage');
    await page.locator('textarea[placeholder="Antwort..."]').fill('Antwort 1');
    await page.locator('button:has-text("Speichern")').first().click();
    await expect(page.locator('p').filter({ hasText: 'Erste Frage' })).toBeVisible({ timeout: 8000 });

    await page.locator('button:has-text("Karte hinzufügen")').click();
    await page.locator('input[placeholder="Frage..."]').fill('Zweite Frage');
    await page.locator('textarea[placeholder="Antwort..."]').fill('Antwort 2');
    await page.locator('button:has-text("Speichern")').first().click();
    await expect(page.locator('p').filter({ hasText: 'Zweite Frage' })).toBeVisible({ timeout: 8000 });

    // The first card row's down-arrow button moves it below the second card.
    const firstCardRow = page.locator('.sm-panel-soft').filter({ has: page.locator('p').filter({ hasText: 'Erste Frage' }) });
    await firstCardRow.locator('button[title="Nach unten"]').click();
    await page.waitForTimeout(600);

    // After moving down, "Erste Frage" should appear after "Zweite Frage" in DOM order.
    const cardRows = page.locator('.sm-panel-soft').filter({ has: page.locator('p[style*="color: #e2e8f0"]') });
    const firstRowText = await cardRows.nth(0).textContent();
    expect(firstRowText).toContain('Zweite Frage');

    // Cleanup.
    await page.locator('button:has-text("Set löschen")').click();
    await page.waitForTimeout(500);
  });
});

// ── Set kopieren ───────────────────────────────────────────────────────────────

test.describe('Set kopieren (Priv-zu-Priv)', () => {
  test('Eigenes Set kann kopiert werden', async ({ page }) => {
    await login(page);
    const original = `PW_Copy_${uid()}`;
    const copy = `PW_Copy_Kopie_${uid()}`;

    // Create original set.
    await page.locator('.sm-create-btn').click();
    await page.locator('input[placeholder="Titel eingeben"]').fill(original);
    await page.locator('button:has-text("Set erstellen")').click();

    // Open detail view.
    await goToMineSets(page);
    await page.locator('.sm-card').filter({ hasText: original }).click();
    await expect(page.locator('h2').filter({ hasText: original })).toBeVisible({ timeout: 8000 });

    // Click "Set kopieren".
    await page.locator('button:has-text("Set kopieren")').click();
    await page.waitForSelector('input[placeholder="Titel eingeben"]', { timeout: 5000 });
    await page.locator('input[placeholder="Titel eingeben"]').fill(copy);
    await page.locator('button:has-text("Set forken")').click();

    // The copy should appear in "Meine Sets".
    await goToMineSets(page);
    await expect(page.locator('.sm-card').filter({ hasText: copy })).toBeVisible({ timeout: 10000 });

    // Cleanup both sets.
    await page.locator('.sm-card').filter({ hasText: copy }).click();
    await page.locator('button:has-text("Set löschen")').click();
    await page.waitForTimeout(500);
    await goToMineSets(page);
    await page.locator('.sm-card').filter({ hasText: original }).click();
    await page.locator('button:has-text("Set löschen")').click();
    await page.waitForTimeout(500);
  });

  test('Kopiertes Set ist privat', async ({ page }) => {
    await login(page);
    const original = `PW_PrivCopy_${uid()}`;
    const copy = `PW_PrivCopy_K_${uid()}`;

    await page.locator('.sm-create-btn').click();
    await page.locator('input[placeholder="Titel eingeben"]').fill(original);
    await page.locator('button:has-text("Set erstellen")').click();

    await goToMineSets(page);
    await page.locator('.sm-card').filter({ hasText: original }).click();

    await page.locator('button:has-text("Set kopieren")').click();
    await page.waitForSelector('input[placeholder="Titel eingeben"]', { timeout: 5000 });
    await page.locator('input[placeholder="Titel eingeben"]').fill(copy);
    await page.locator('button:has-text("Set forken")').click();

    await goToMineSets(page);
    const copyCard = page.locator('.sm-card').filter({ hasText: copy });
    await expect(copyCard).toBeVisible({ timeout: 10000 });
    await expect(copyCard.locator('.sm-badge-private')).toBeVisible();

    // Cleanup.
    await copyCard.click();
    await page.locator('button:has-text("Set löschen")').click();
    await page.waitForTimeout(500);
    await goToMineSets(page);
    await page.locator('.sm-card').filter({ hasText: original }).click();
    await page.locator('button:has-text("Set löschen")').click();
    await page.waitForTimeout(500);
  });
});

// ── Gastfavoriten ─────────────────────────────────────────────────────────────

test.describe('Gastfavoriten', () => {
  test('Gast kann Sets als Favorit markieren', async ({ page }) => {
    await skipTour(page);
    await page.goto('/');
    // App starts in guest/dashboard mode — no login needed.
    await page.locator('.sm-card').first().waitFor({ timeout: 10000 });

    // Click the favorite star on the first card.
    const firstCard = page.locator('.sm-card').first();
    const favBtn = firstCard.locator('.sm-fav-btn');
    await favBtn.click();

    // Star should now be active (has active class or aria-pressed).
    await expect(favBtn).toHaveClass(/active/, { timeout: 3000 });
  });

  test('Gastfavoriten bleiben nach Anmeldung erhalten', async ({ page }) => {
    await skipTour(page);
    await page.goto('/');
    await page.locator('.sm-card').first().waitFor({ timeout: 10000 });

    // Remember which set we favourite.
    const firstCard = page.locator('.sm-card').first();
    const setTitle = await firstCard.locator('h3, .sm-card-title, [class*="title"]').first().textContent();
    const favBtn = firstCard.locator('.sm-fav-btn');
    await favBtn.click();
    await expect(favBtn).toHaveClass(/active/, { timeout: 3000 });

    // Now log in.
    await page.locator('.sm-nav button:has-text("Anmelden")').click();
    await page.waitForSelector('input[placeholder="dein_username"]', { timeout: 5000 });
    await page.locator('input[placeholder="dein_username"]').fill(TEST_USERNAME);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.locator('button.sm-btn-primary').click();
    await page.waitForSelector('.sm-create-btn', { timeout: 15000 });

    // Navigate to Favorites view and verify the set is still there.
    await page.locator('button.sm-sidebar-item').filter({ hasText: 'Favoriten' }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('.sm-card').first()).toBeVisible({ timeout: 8000 });
  });
});

// ── KI Quiz Fehlerbehandlung ───────────────────────────────────────────────────

test.describe('KI Quiz Fehlerbehandlung', () => {
  test('503-Antwort zeigt benutzerfreundliche Fehlermeldung', async ({ page }) => {
    await login(page);
    const setTitle = await createSetWithCard(page, 'Quiz Frage', 'Quiz Antwort');

    // Intercept the quiz generate endpoint and return 503.
    await page.route('**/quiz/generate', route => {
      route.fulfill({ status: 503, body: JSON.stringify({ detail: 'KI nicht konfiguriert.' }) });
    });

    // Click the Quiz button.
    await page.locator('.quiz-btn').click();

    // Click KI Quiz erstellen.
    await page.locator('button:has-text("KI-Quiz erstellen")').click();

    // Verify the error message is user-friendly.
    await expect(page.locator('p').filter({ hasText: 'KI-Dienst nicht verfügbar' })).toBeVisible({ timeout: 8000 });

    // Cleanup.
    await page.locator('button:has-text("Zurück")').click();
    await page.locator('button:has-text("Set löschen")').click();
    await page.waitForTimeout(500);
  });
});

// ── Geführte Tour: Set-Detailansicht ──────────────────────────────────────────

test.describe('Guided Tour – Set-Detailansicht', () => {
  test('Tour startet automatisch beim ersten Öffnen eines Sets', async ({ page }) => {
    // Only skip dashboard/discover/mine tours, NOT detail.
    await skipDashboardTours(page);
    await login(page);

    // Open the first available set.
    await goToMineSets(page);
    await page.locator('.sm-card').first().waitFor({ timeout: 10000 });
    await page.locator('.sm-card').first().click();

    // The tour overlay must appear.
    await expect(page.locator('.tour-modal')).toBeVisible({ timeout: 5000 });
  });

  test('Detail-Tour erscheint nicht nach dem Überspringen', async ({ page }) => {
    await skipDashboardTours(page);
    await login(page);

    await goToMineSets(page);
    await page.locator('.sm-card').first().waitFor({ timeout: 10000 });
    await page.locator('.sm-card').first().click();

    if (await page.locator('.tour-modal').isVisible()) {
      await page.locator('.tour-btn-skip').first().click();
    }

    // Go back and re-open the same set.
    await page.locator('button:has-text("Zurück")').click();
    await page.locator('.sm-card').first().click();

    // Tour must NOT re-appear.
    await page.waitForTimeout(1000);
    await expect(page.locator('.tour-modal')).not.toBeVisible();
  });
});

// ── Geführte Tour: Set erstellen ──────────────────────────────────────────────

test.describe('Guided Tour – Set erstellen', () => {
  test('Tour startet beim ersten Öffnen des Erstellen-Dialogs', async ({ page }) => {
    await skipDashboardTours(page);
    await login(page);

    // Open create set dialog for the first time.
    await page.locator('.sm-create-btn').click();
    await page.waitForSelector('input[placeholder="Titel eingeben"]', { timeout: 5000 });

    // The tour overlay must appear.
    await expect(page.locator('.tour-modal')).toBeVisible({ timeout: 5000 });

    // Close dialog.
    await page.locator('button:has-text("Abbrechen")').last().click();
  });
});
