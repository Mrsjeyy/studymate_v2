// Env vars are loaded by playwright.config.js via dotenv before any test runs.
export const TEST_USERNAME = process.env.TEST_USERNAME || 'testUser';
export const TEST_PASSWORD = process.env.TEST_PASSWORD || 'password';

/** Disable the guided tour by presetting localStorage before page hydration. */
export async function skipTour(page) {
  await page.addInitScript(() => {
    const completed = {
      dashboard: true,
      discover: true,
      mine: true,
      detail: true,
      createSet: true,
    };
    localStorage.setItem('sm_tour_completed', JSON.stringify(completed));
  });
}

/**
 * Navigate to the app, skip the tour, and log in.
 * New flow: app starts in guest mode → click navbar "Anmelden" → fill form.
 */
export async function login(page, username = TEST_USERNAME, password = TEST_PASSWORD) {
  await skipTour(page);
  await page.goto('/');
  // Wait for the guest-mode navbar to appear.
  await page.waitForSelector('.sm-nav', { timeout: 10000 });
  // Open the auth form via the navbar login button.
  await page.locator('.sm-nav button:has-text("Anmelden")').click();
  // Auth form is now visible (NavBar is hidden in auth view).
  await page.waitForSelector('input[placeholder="dein_username"]', { timeout: 5000 });
  await page.locator('input[placeholder="dein_username"]').fill(username);
  await page.locator('input[type="password"]').fill(password);
  // Submit — only one primary button visible now that the navbar is hidden.
  await page.locator('button.sm-btn-primary').click();
  await page.waitForSelector('.sm-create-btn', { timeout: 15000 });
}

/** Open the auth form without logging in (useful for testing the form itself). */
export async function goToAuthForm(page) {
  await skipTour(page);
  await page.goto('/');
  await page.waitForSelector('.sm-nav', { timeout: 10000 });
  await page.locator('.sm-nav button:has-text("Anmelden")').click();
  await page.waitForSelector('input[placeholder="dein_username"]', { timeout: 5000 });
}

/** Log out via the navbar logout button. */
export async function logout(page) {
  await page.locator('button:has-text("Logout")').click();
  // After logout the app returns to the auth form (navbar is hidden in auth view).
  await page.waitForSelector('input[placeholder="dein_username"]', { timeout: 10000 });
}

/** Switch to the "Meine Sets" tab. */
export async function goToMineSets(page) {
  await page.locator('.mine-tab-btn').click();
  await page.waitForTimeout(500);
}

/** Switch to the "Entdecken" tab. */
export async function goToDiscover(page) {
  await page.locator('.discover-tab-btn').click();
  await page.waitForTimeout(500);
}
