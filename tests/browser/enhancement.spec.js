import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('repository subpath loads all local modules, basemap and downloads', async ({ page }) => {
  await page.route('**/ocean-hidden-response/**', async route => {
    const target=new URL(route.request().url());
    const path=target.pathname.slice('/ocean-hidden-response/'.length) || 'index.html';
    const type=path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':path.endsWith('.html')?'text/html':'application/json';
    await route.fulfill({body:await readFile(new URL(`../../dist/${path}`,import.meta.url)),contentType:type});
  });
  await page.goto('/ocean-hidden-response/?variable=sst&region=nwp&start=2014-01&end=2025-12');
  await expect(page.locator('#trend-rows')).toContainText('142');
  await expect(page.locator('#locator-chart')).toHaveAttribute('data-basemap','natural-earth');
  await page.locator('#region').selectOption('both');
  await expect(page).toHaveURL(/\/ocean-hidden-response\/\?/);
  expect(await page.locator('#downloads a').first().getAttribute('href')).toBe('./downloads/observations.csv');
});

test('clipboard refusal exposes a selectable current link and clears it for draft dates', async ({ page }) => {
  await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(new Error('denied'))},configurable:true}));
  await page.goto('/');
  await page.locator('#copy-link').click();
  await expect(page.locator('#share-url')).toBeVisible();
  await expect(page.locator('#share-url')).toHaveValue(/variable=chlor_a/);
  await expect(page.locator('#share-url')).toBeFocused();
  await page.locator('#start').fill('2020-01');
  await expect(page.locator('#share-fallback')).toBeHidden();
});

test('empty archive reports no inference; loading and failed requests have recovery', async ({ page }) => {
  await page.route('**/data/observations.json', async route=>{
    const response=await route.fetch();
    const data=await response.json();
    data.records=[];
    await route.fulfill({response,json:data});
  });
  await page.goto('/');
  await expect(page.locator('#load-state')).toContainText('no observations');
  await expect(page.locator('#chart svg')).toHaveCount(0);
  await expect(page.locator('#uncertainty-chart svg')).toHaveCount(0);
  await expect(page.locator('#export-selection')).toBeDisabled();
  await page.unroute('**/data/observations.json');
  await page.locator('#retry').click();
  await expect(page.locator('#chart svg')).toBeVisible();
});

test('200 percent zoom equivalent, text enlargement and reduced motion remain usable', async ({ page }) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:683,height:450});
  await page.goto('/');
  await expect(page.locator('#chart svg')).toBeVisible();
  await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  await page.locator('#variable').selectOption('sst');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.locator('#uncertainty-chart svg')).toBeVisible();
  await page.locator('#copy-link').focus();
  await expect(page.locator('#copy-link')).toBeFocused();
});

test('shareable selection restores after reload and browser history', async ({ page }) => {
  await page.goto('/?variable=sst&region=eep&start=2014-01&end=2025-12');
  await expect(page.locator('#variable')).toHaveValue('sst');
  await expect(page.locator('#region')).toHaveValue('eep');
  await page.locator('#region').selectOption('nwp');
  await expect(page).toHaveURL(/region=nwp/);
  await page.goBack();
  await expect(page.locator('#region')).toHaveValue('eep');
  await page.goForward();
  await expect(page.locator('#region')).toHaveValue('nwp');
  await page.reload();
  await expect(page.locator('#start')).toHaveValue('2014-01');
  await page.goto('/?variable=made-up&start=2025-99');
  await expect(page.locator('#share-status')).toContainText('invalid');
  await expect(page.locator('#variable')).toHaveValue('chlor_a');
});

test('selected CSV keeps missing observations and draft dates disable sharing', async ({ page }) => {
  await page.goto('/?variable=chlor_a&region=eep&start=2023-01&end=2023-03');
  const download = page.waitForEvent('download');
  await page.locator('#export-selection').click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('oceans-hidden-response_chlor_a_eep_2023-01_2023-03.csv');
  const csv = await readFile(await file.path(), 'utf8');
  expect(csv).toContain('2023-02,eep,chlor_a,null,mg/m3');
  expect(csv).toContain('excluded_missing,explicit_null');
  expect(csv).not.toContain('trendPerDecade');
  expect(csv.trim().split('\r\n')).toHaveLength(4);
  await page.locator('#start').fill('2022-01');
  await expect(page.locator('#export-selection')).toBeDisabled();
  await expect(page.locator('#copy-link')).toBeDisabled();
  await expect(page).toHaveURL(/start=2023-01/);
});

test('reference question, findings and guided examples are immediately usable', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#research-question')).toContainText('chlorophyll');
  await expect(page.locator('#reference-summary')).toContainText(/inconclusive/i);
  await page.locator('.guide summary').click();
  await page.locator('#example-sst').click();
  await expect(page.locator('#variable')).toHaveValue('sst');
  await expect(page.locator('#active-source')).toContainText('NASA JPL');
  await page.locator('#example-chlorophyll').click();
  await expect(page.locator('#variable')).toHaveValue('chlor_a');
  await expect(page.locator('#active-source')).toContainText('NOAA');
  await expect(page.locator('#start')).toHaveValue('2013-01');
  await expect(page.locator('#region')).toHaveValue('both');
});

test('geographic context has bundled land and an honest recoverable fallback', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#locator-chart')).toHaveAttribute('data-basemap', 'natural-earth');
  await expect(page.locator('#locator-note')).toContainText('Natural Earth');
  await expect(page.locator('#region-bounds')).toContainText('120°W');
  await page.route('**/assets/ne_110m_land.geojson', route => route.abort());
  await page.reload();
  await expect(page.locator('#locator-chart')).toHaveAttribute('data-basemap', 'schematic');
  await expect(page.locator('#locator-note')).toContainText('fallback');
  await expect(page.locator('#chart svg')).toBeVisible();
});

test('trend intervals use separate units and clear immediately for draft dates', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#uncertainty-chart svg')).toBeVisible();
  await expect(page.locator('#uncertainty-chart')).toContainText('% per decade');
  await expect(page.locator('#comparison-interval')).toContainText('ratio');
  await page.locator('#start').fill('2020-01');
  await expect(page.locator('#uncertainty-chart svg')).toHaveCount(0);
  await expect(page.locator('#comparison-interval svg')).toHaveCount(0);
  await page.getByRole('button', { name: 'Apply dates', exact: true }).click();
  await expect(page.locator('#uncertainty-chart')).toContainText(/unavailable/i);
  await page.locator('#restore').click();
  await expect(page.locator('#uncertainty-chart svg')).toBeVisible();
  await page.locator('#variable').selectOption('sst');
  await expect(page.locator('#uncertainty-chart')).toContainText('°C per decade');
  await expect(page.locator('#comparison')).toBeHidden();
});
