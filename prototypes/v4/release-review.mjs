import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';

const root = resolve('dist');
const types = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.ico':'image/x-icon'};
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\/ocean-hidden-response/, '');
    const file = resolve(root, `.${pathname.endsWith('/') ? `${pathname}index.html` : pathname}`);
    if (!file.startsWith(root + sep)) throw new Error('Invalid path');
    const content = await readFile(file);
    response.writeHead(200, {'Content-Type':types[extname(file)] || 'application/octet-stream'});
    response.end(content);
  } catch { response.writeHead(404); response.end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const url = `http://127.0.0.1:${server.address().port}/ocean-hidden-response/`;
await mkdir('prototypes/v4/screenshots/review', {recursive:true});
for (const [name, executablePath] of [['chrome','C:/Program Files/Google/Chrome/Application/chrome.exe'],['edge','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe']]) {
  const browser = await chromium.launch({headless:true, executablePath});
  for (const width of [360, 1366]) {
    const page = await browser.newPage({viewport:{width,height:900}});
    const errors=[];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url, {waitUntil:'networkidle'});
    await page.locator('#reference-findings svg').first().waitFor();
    const result = await page.evaluate(() => ({overflow:document.documentElement.scrollWidth>innerWidth, findings:document.querySelectorAll('#reference-findings svg').length, map:!!document.querySelector('#locator-chart svg'), dateFields:[...document.querySelectorAll('input[type=month]')].map(e=>({width:e.clientWidth,scrollWidth:e.scrollWidth}))}));
    await page.screenshot({path:`prototypes/v4/screenshots/review/${name}-${width}.png`,fullPage:true});
    if (width===360) {
      await page.keyboard.press('Tab');
      const skip=await page.evaluate(()=>document.activeElement?.className);
      await page.locator('#menu-toggle').focus(); await page.keyboard.press('Enter');
      const opened=await page.locator('#menu-toggle').getAttribute('aria-expanded');
      await page.screenshot({path:`prototypes/v4/screenshots/review/${name}-menu.png`});
      await page.keyboard.press('Escape');
      console.log(name,width,JSON.stringify(result),JSON.stringify(errors),`skip=${skip} menu=${opened} closed=${await page.locator('#menu-toggle').getAttribute('aria-expanded')}`);
      await page.emulateMedia({forcedColors:'active'});
      await page.locator('#menu-toggle').focus();
      await page.screenshot({path:`prototypes/v4/screenshots/review/${name}-forced-colors.png`});
      console.log(name, 'forced-colors', await page.evaluate(() => matchMedia('(forced-colors: active)').matches));
    } else console.log(name,width,JSON.stringify(result),JSON.stringify(errors));
    await page.close();
  }
  await browser.close();
}
await new Promise(done => server.close(done));
