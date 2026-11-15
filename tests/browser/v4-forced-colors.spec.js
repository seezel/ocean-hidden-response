import { test, expect } from '@playwright/test';

for (const scheme of ['light', 'dark']) {
  test(`brand mark keeps approved color in normal ${scheme} preference`, async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'none', colorScheme: scheme });
    await page.goto('/');
    const stroke = await page.locator('.brand-mark circle').evaluate(element => getComputedStyle(element).stroke);
    expect(stroke).toBe('rgb(140, 219, 217)');
  });

  test(`brand mark follows system link color in ${scheme} forced colors`, async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active', colorScheme: scheme });
    await page.goto('/');
    const mark = page.locator('.brand-mark');
    await expect(mark).toBeVisible();
    const colors = await mark.evaluate(element => {
      const probe = document.createElement('span');
      probe.style.color = 'LinkText';
      document.body.append(probe);
      const expected = getComputedStyle(probe).color;
      probe.remove();
      return { actual: getComputedStyle(element.querySelector('circle')).stroke, expected, adjustment: getComputedStyle(element).forcedColorAdjust };
    });
    expect(colors.actual).toBe(colors.expected);
    expect(colors.adjustment).not.toBe('none');
  });

  test(`scientific graphics follow system colors in ${scheme} forced colors`, async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active', colorScheme: scheme });
    await page.goto('/');
    await expect(page.locator('#chart svg')).toBeVisible();
    await expect(page.locator('#locator-chart[data-basemap="natural-earth"]')).toBeVisible();
    const colors = await page.evaluate(() => {
      const probe = document.createElement('span');
      probe.style.color = 'CanvasText';
      document.body.append(probe);
      const expected = getComputedStyle(probe).color;
      probe.remove();
      const style = selector => getComputedStyle(document.querySelector(selector));
      return { expected, chart:style('#chart path[stroke]').stroke, chartText:style('#chart text').fill,
        interval:style('#reference-chlorophyll line[stroke]').stroke,
        intervalText:style('#reference-chlorophyll text').fill,
        mapLabel:style('#locator-chart svg text').fill,
        mapRegion:style('#locator-chart svg rect[fill="none"]').stroke };
    });
    for (const [name, color] of Object.entries(colors)) if (name !== 'expected') expect(color, name).toBe(colors.expected);
    const dashes = await page.locator('#reference-chlorophyll line[stroke]').evaluateAll(lines => lines.map(line => line.getAttribute('stroke-dasharray')));
    expect(dashes).toContain('12 5');
  });
}

test('keyboard navigation and error feedback remain usable in forced colors', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active', colorScheme: 'dark' });
  await page.setViewportSize({ width: 390, height: 850 });
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('.brand')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#menu-toggle')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#menu-toggle')).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Tab');
  await expect(page.locator('#main-navigation a').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#menu-toggle')).toBeFocused();
  await expect(page.locator('#menu-toggle')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#start')).toBeEnabled();
  await page.locator('#start').fill('2025-12');
  await page.locator('#end').fill('2013-01');
  await page.locator('#controls button[type="submit"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#form-message')).toContainText('Start month must come before');
  await expect(page.locator('#copy-link')).toBeDisabled();
  await expect(page.locator('#export-selection')).toBeDisabled();
});
