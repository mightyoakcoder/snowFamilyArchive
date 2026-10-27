import { test as setup, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authFile = path.join(__dirname, '../playwright/.auth/user.json');

const username = process.env.VITE_TEST_USERNAME;
const password = process.env.VITE_TEST_PASSWORD;

setup('authenticate', async ({ page }) => {
    if (!username || !password) {
        throw new Error('VITE_TEST_USERNAME / VITE_TEST_PASSWORD are not set in .env');
    }

    await page.goto('http://localhost:5173/login');
    await page.getByLabel('Email').fill(username);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await page.waitForURL(url => !url.pathname.startsWith('/login'));
    await page.context().storageState({ path: authFile });
});