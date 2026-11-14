import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSite, PUBLIC_FILES } from '../tools/build.mjs';

test('public build contains only the declared artifacts and removes stale private files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ocean-build-'));
  for (const name of PUBLIC_FILES) {
    await mkdir(join(root, name, '..'), { recursive: true });
    await writeFile(join(root, name), `public ${name}`);
  }
  await mkdir(join(root, 'dist'), { recursive: true });
  await writeFile(join(root, 'dist', '.env'), 'TEST-ONLY FAKE PRIVATE SENTINEL');
  await mkdir(join(root, 'data', 'raw'), { recursive: true });
  await writeFile(join(root, 'data', 'raw', 'private.nc'), 'TEST-ONLY RAW SENTINEL');
  await writeFile(join(root, '.netrc'), 'TEST-ONLY FAKE PRIVATE SENTINEL');
  await buildSite(root);
  assert.equal(await readFile(join(root, 'dist', 'index.html'), 'utf8'), 'public index.html');
  await assert.rejects(access(join(root, 'dist', '.env')));
  await assert.rejects(access(join(root, 'dist', '.netrc')));
  await assert.rejects(access(join(root, 'dist', 'data', 'raw', 'private.nc')));
});
