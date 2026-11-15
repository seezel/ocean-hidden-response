import {test,expect} from '@playwright/test';
test('hero locator labels and clipping resolve locally with distinct map IDs',async({page})=>{
  const verify=async(geographic)=>{
    await expect(page.locator('#hero-locator')).toHaveAttribute('data-basemap',geographic?'natural-earth':'schematic');
    const result=await page.locator('#hero-locator svg').evaluate(svg=>{
      const ids=[...svg.querySelectorAll('[id]')].map(node=>node.id);
      const labels=(svg.getAttribute('aria-labelledby')||'').split(/\s+/).filter(Boolean);
      const clips=[...svg.querySelectorAll('[clip-path]')].map(node=>node.getAttribute('clip-path').match(/^url\(#(.+)\)$/)?.[1]);
      const main=[...document.querySelectorAll('#locator-chart svg [id]')].map(node=>node.id);
      return {ids,labels,clips,missing:[...labels,...clips].filter(id=>!ids.includes(id)),shared:ids.filter(id=>main.includes(id))};
    });
    console.log('Hero SVG references:',JSON.stringify(result));
    expect(result.labels.length).toBeGreaterThan(0);
    expect(result.missing).toEqual([]);
    expect(result.shared).toEqual([]);
    expect(result.clips.length).toBe(geographic?1:0);
  };
  for(const width of [360,1366]){
    await page.setViewportSize({width,height:900});
    await page.goto('/dist/');
    await verify(true);
    await page.locator('.hero').screenshot({path:`.cache/hero-labels-${width}.png`});
  }
  await page.route('**/assets/ne_110m_land.geojson',route=>route.abort());
  await page.reload();
  await verify(false);
});
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
