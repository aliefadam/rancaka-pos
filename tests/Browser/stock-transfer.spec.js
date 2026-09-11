import { expect, test } from '@playwright/test';

async function login(page, username) {
    await page.goto('/login');
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Password').fill('Playwright123!');
    await page.getByRole('button', { name: /masuk/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
}

test('pengirim mengirim stok dan cabang tujuan menerimanya', async ({ page }) => {
    const browserErrors = [];
    const failedAppRequests = [];
    page.on('pageerror', (error) => browserErrors.push(error.message));
    page.on('console', (message) => {
        if (message.type() === 'error' && !message.text().includes('Failed to load resource')) browserErrors.push(message.text());
    });
    page.on('requestfailed', (request) => {
        if (request.url().startsWith('http://127.0.0.1:8123')) failedAppRequests.push(`${request.method()} ${request.url()}`);
    });

    await login(page, 'e2e.transfer.sender');
    await page.goto('/tenant/stock-transfers');
    await expect(page.getByRole('heading', { name: 'Stok bergerak. Jejak tetap utuh.' })).toBeVisible();
    await page.getByTestId('create-transfer').click();
    await page.getByTestId('destination').selectOption({ label: 'E2E Cabang Penerima' });
    const productValue = await page.getByTestId('product-0').locator('option', { hasText: 'E2E Kopi Botol' }).getAttribute('value');
    await page.getByTestId('product-0').selectOption(productValue);
    await page.getByTestId('quantity-0').fill('3');
    await page.getByPlaceholder('Contoh: Restock untuk akhir pekan').fill('Pengujian browser Playwright');
    await page.getByTestId('submit-transfer').click();
    await expect(page).toHaveURL(/\/tenant\/stock-transfers\/\d+/);
    const transferNumber = (await page.getByTestId('transfer-number').textContent()).trim();
    await expect(page.getByText('Dalam perjalanan', { exact: true }).first()).toBeVisible();

    await page.context().clearCookies();
    await login(page, 'e2e.transfer.receiver');
    await page.goto('/tenant/stock-transfers');
    await page.getByText(transferNumber, { exact: true }).click();
    await page.getByTestId('receive-transfer').click();
    await expect(page.getByText('Diterima', { exact: true })).toBeVisible();

    await page.goto('/tenant/stock/products');
    const productCard = page.getByText('E2E Kopi Botol', { exact: true }).locator('..');
    await expect(productCard.getByText('5 pcs', { exact: true })).toBeVisible();
    expect(browserErrors).toEqual([]);
    expect(failedAppRequests).toEqual([]);
});
