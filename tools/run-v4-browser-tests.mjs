import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const root = resolve('.');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.csv': 'text/csv', '.zip': 'application/zip' };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const path = resolve(root, `.${pathname.endsWith('/') ? `${pathname}index.html` : pathname}`);
    if (path !== root && !path.startsWith(root + sep)) throw new Error('Invalid path');
    const body = await readFile(path);
    response.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream' });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
});

await new Promise((resolveListen, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolveListen);
});
const port = server.address().port;
const require = createRequire(import.meta.url);
const cli = require.resolve('@playwright/test/cli');
const child = spawn(process.execPath, [cli, 'test', '--config', 'prototypes/v4/playwright.config.mjs', ...process.argv.slice(2)], {
  stdio: 'inherit', env: { ...process.env, V4_TEST_PORT: String(port) }, windowsHide: true,
});
const result = await new Promise(resolveChild => {
  child.once('error', error => resolveChild({ error }));
  child.once('exit', (code, signal) => resolveChild({ code, signal }));
});
await new Promise(resolveClose => server.close(resolveClose));
if (result.error) throw result.error;
if (result.signal) throw new Error(`Playwright ended on ${result.signal}`);
process.exitCode = result.code ?? 1;
