import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#trend-rows tr')).toHaveCount(2);
});

test('real reference, NASA provenance, all reading panels and downloads work', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await expect(page.locator('#comparison-content')).toContainText(/inconclusive/i);
  await expect(page.locator('#trend-rows')).toContainText('154');
  for (const summary of await page.locator('details > summary').all()) {
    await summary.click();
    await expect(summary.locator('..')).toHaveAttribute('open', '');
    await summary.click();
  }
  await page.locator('#observation-details > summary').click();
  await expect(page.locator('#observation-rows tr')).toHaveCount(312);
  await page.locator('#methods details').last().locator('summary').click();
  await expect(page.locator('#verification-record')).toContainText('2013');
  await expect(page.locator('#verification-record')).toContainText('MODIS');
  for (const link of await page.locator('#downloads a[download]').all()) {
    const download = page.waitForEvent('download');
    await link.click();
    expect((await download).suggestedFilename()).toMatch(/observations\.csv|reproduction\.zip/);
  }
  expect(errors).toEqual([]);
});

test('measure and region controls update the visible investigation', async ({ page }) => {
  await page.locator('#variable').selectOption('sst');
  await expect(page.locator('#chart-title')).toHaveText('Sea surface temperature');
  await expect(page.locator('#trend-rows')).toContainText('°C');
  await expect(page.locator('#comparison')).toBeHidden();
  await page.locator('#region').selectOption('eep');
  await expect(page.locator('#trend-rows tr')).toHaveCount(1);
  await expect(page.locator('#trend-rows')).toContainText('Eastern');
  await page.locator('#restore').click();
  await expect(page.locator('#variable')).toHaveValue('chlor_a');
  await expect(page.locator('#region')).toHaveValue('both');
  await expect(page.locator('#start')).toHaveValue('2013-01');
  await expect(page.locator('#end')).toHaveValue('2025-12');
  await expect(page.locator('#trend-rows tr')).toHaveCount(2);
  await expect(page.locator('#comparison-content')).toContainText(/inconclusive/i);
});

test('changed and insufficient windows cannot retain reference statistics', async ({ page }) => {
  await expect(page.locator('#trend-rows')).toContainText('-16.31');
  await page.locator('#start').fill('2020-01');
  await page.locator('#start').dispatchEvent('change');
  await expect(page.locator('#trend-rows')).not.toContainText('-16.31');
  await page.getByRole('button', { name: 'Apply dates', exact: true }).click();
  await expect(page.locator('#investigation-mode')).toHaveText('Exploratory date window');
  await expect(page.locator('#trend-rows')).toContainText(/unavailable|not available/i);
  await expect(page.locator('#comparison-content')).not.toContainText('0.822');
  await page.locator('#restore').click();
  await expect(page.locator('#trend-rows')).toContainText('-16.31');
});

test('valid custom dates recompute counts and preserve exploratory labeling', async ({ page }) => {
  await page.locator('#start').fill('2014-01');
  await page.locator('#start').dispatchEvent('change');
  await page.getByRole('button', { name: 'Apply dates', exact: true }).click();
  await expect(page.locator('#trend-rows')).toContainText('142');
  await expect(page.locator('#investigation-mode')).toHaveText('Exploratory date window');
});

test('keyboard navigation exposes focus and reaches real page destinations', async ({ page }) => {
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to investigation' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#investigation$/);
  await page.locator('#variable').focus();
  expect(await page.locator('#variable').evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe('none');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.locator('#variable')).toHaveValue('sst');
});

test('mobile, tablet and desktop reflow without clipping the page', async ({ page }) => {
  await mkdir('artifacts/screenshots', { recursive: true });
  for (const width of [360, 768, 1366]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const controls = await page.locator('#controls button, #controls select, #controls input').evaluateAll((elements) =>
      elements.map((element) => ({ id: element.id, height: element.getBoundingClientRect().height })));
    expect(controls.every((control) => control.height >= 44)).toBe(true);
    await page.screenshot({ path: `artifacts/screenshots/reference-${width}.png`, fullPage: true });
  }
});

test('failed data requests show a recoverable error without synthetic observations', async ({ page }) => {
  await page.route('**/data/observations.json', (route) => route.abort());
  await page.reload();
  await expect(page.locator('#retry')).toBeVisible();
  await expect(page.locator('#investigation-body')).toBeHidden();
  await page.unroute('**/data/observations.json');
  await page.locator('#retry').click();
  await expect(page.locator('#trend-rows tr')).toHaveCount(2);
});
