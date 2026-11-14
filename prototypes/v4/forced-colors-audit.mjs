import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';

const root = resolve('dist');
const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.ico':'image/x-icon' };
const server = createServer(async (req,res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const path = resolve(root, `.${pathname.endsWith('/') ? `${pathname}index.html` : pathname}`);
    if (!path.startsWith(root + sep)) throw new Error('Invalid path');
    const data = await readFile(path);
    res.writeHead(200, {'Content-Type':types[extname(path)] || 'application/octet-stream'});
    res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const url=`http://127.0.0.1:${server.address().port}/`;
const folder='prototypes/v4/screenshots/forced-audit';
await mkdir(folder,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
for(const scheme of ['light','dark']) {
  const page=await browser.newPage({viewport:{width:390,height:850}});
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.emulateMedia({forcedColors:'active',colorScheme:scheme});
  await page.goto(url,{waitUntil:'networkidle'});
  await page.locator('#chart svg').waitFor();
  await page.locator('#menu-toggle').focus();
  await page.screenshot({path:`${folder}/${scheme}-hero.png`});
  await page.locator('#menu-toggle').click();
  await page.screenshot({path:`${folder}/${scheme}-menu.png`});
  await page.keyboard.press('Escape');
  console.log(scheme,'after navigation',await page.evaluate(()=>({forced:matchMedia('(forced-colors: active)').matches, canvas:getComputedStyle(document.body).backgroundColor})));
  for(const [name,selector] of [['controls','#controls'],['exports','.selection-actions'],['chart','.main-figure'],['map','.locator'],['findings','#reference-findings'],['comparison','#reference-comparison']]) {
    await page.locator(selector).scrollIntoViewIfNeeded();
    await page.emulateMedia({forcedColors:'active',colorScheme:scheme});
    console.log(scheme,name,await page.evaluate(()=>({forced:matchMedia('(forced-colors: active)').matches,canvas:getComputedStyle(document.documentElement).backgroundColor,chart:getComputedStyle(document.querySelector('#chart path[stroke]')).stroke})));
    await page.screenshot({path:`${folder}/${scheme}-${name}.png`});
  }
  await page.locator('#start').fill('2025-12');
  await page.locator('#end').fill('2013-01');
  await page.locator('#controls button[type=submit]').click();
  await page.locator('#controls').scrollIntoViewIfNeeded();
  await page.emulateMedia({forcedColors:'active',colorScheme:scheme});
  await page.screenshot({path:`${folder}/${scheme}-error.png`});
  const data=await page.evaluate(()=>({
    overflow:document.documentElement.scrollWidth>innerWidth,
    mark:getComputedStyle(document.querySelector('.brand-mark circle')).stroke,
    chartStroke:document.querySelector('#chart path[stroke]') ? getComputedStyle(document.querySelector('#chart path[stroke]')).stroke : 'cleared for invalid window',
    intervalStroke:getComputedStyle(document.querySelector('#reference-chlorophyll line[stroke]')).stroke,
    status:document.querySelector('#form-message').textContent,
  }));
  console.log(scheme,JSON.stringify(data),JSON.stringify(errors));
  await page.close();
}
await browser.close();
await new Promise(done=>server.close(done));
