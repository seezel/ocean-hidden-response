import {test,expect} from '@playwright/test';
test('approved hero and responsive navigation work with the real investigation', async ({page})=>{
  await page.setViewportSize({width:360,height:800});
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'Explore the hidden patterns of our oceans.'})).toBeVisible();
  await expect(page.locator('#hero-locator svg')).toBeVisible();
  const menu=page.locator('#menu-toggle');
  await menu.click(); await expect(menu).toHaveAttribute('aria-expanded','true');
  await page.keyboard.press('Escape'); await expect(menu).toHaveAttribute('aria-expanded','false'); await expect(menu).toBeFocused();
  await page.getByRole('link',{name:'Explore observations'}).click();
  await expect(page.locator('#variable')).toBeEnabled();
  await page.locator('#variable').selectOption('sst');
  await expect(page.locator('#chart-title')).toHaveText('Sea surface temperature');
});
test('built icon assets resolve relative to a nested path',async({page})=>{
  await page.goto('/dist/');
  const icons=await page.locator('link[rel*="icon"]').evaluateAll(nodes=>nodes.map(node=>node.href));
  expect(icons.length).toBeGreaterThanOrEqual(4);
  for(const url of icons){const response=await page.request.get(url);expect(response.ok()).toBeTruthy();}
});
