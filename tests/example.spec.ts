import { test, expect } from '@playwright/test';
import dotenv from 'dotenv'

// Read the credentials directly from the environment
dotenv.config();
const username = process.env.VITE_TEST_USERNAME;
const password = process.env.VITE_TEST_PASSWORD;

// Use them in your app or test
console.log(`Logging in as: ${username}`);

test('has title', async ({ page }) => {
  await page.goto('https://snowfamilyarchive.com/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Playwright/);
});

test('get started link', async ({ page }) => {
  await page.goto('https://snowfamilyarchive.com/');

  // Click the get started link.
  await page.getByRole('link', { name: 'Get started' }).click();

  // Expects page to have a heading with the name of Installation.
  await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
});
