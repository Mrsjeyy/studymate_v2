// Env vars are loaded by playwright.config.js via dotenv before any test runs.
export const TEST_USERNAME = process.env.TEST_USERNAME || 'pw_test_user';
export const TEST_PASSWORD = process.env.TEST_PASSWORD || 'test_pw_123!';

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

/** Navigate to the app, skip the tour, and log in with the test account. */
export async function login(page, username = TEST_USERNAME, password = TEST_PASSWORD) {
  await skipTour(page);
  await page.goto('/');
  await page.locator('input[placeholder="dein_username"]').fill(username);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button:has-text("Anmelden")').click();
  await page.waitForSelector('.sm-create-btn', { timeout: 15000 });
}

/** Log out via the sidebar logout button. */
export async function logout(page) {
  const logoutBtn = page.locator('button[title="Abmelden"], button:has-text("Abmelden")').first();
  await logoutBtn.click();
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
