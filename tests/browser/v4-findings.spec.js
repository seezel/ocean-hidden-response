import {test,expect} from '@playwright/test';
test('reference findings show separately labeled frozen results and stay fixed for exploratory windows',async({page})=>{
  await page.goto('/');
  const findings=page.locator('#reference-findings');
  await expect(findings.locator('svg')).toHaveCount(3);
  await expect(findings.locator('#reference-chlorophyll')).toContainText('-16.31');
  await expect(findings.locator('#reference-temperature')).toContainText('0.41');
  await expect(findings.locator('#reference-comparison')).toContainText('1.77');
  const before=await findings.innerText();
  await page.locator('#start').fill('2014-01');
  await page.getByRole('button',{name:'Apply dates',exact:true}).click();
  await expect(page.locator('#investigation-mode')).toHaveText('Exploratory date window');
  expect(await findings.innerText()).toBe(before);
});
