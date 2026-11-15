import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('social preview uses the intended repository Pages HTTPS target and a bundled image',async()=>{
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  const images=[...html.matchAll(/<meta\s+property="og:image"\s+content="([^"]+)"\s*\/?\s*>/g)];
  assert.equal(images.length,1);
  const url=new URL(images[0][1]);
  assert.equal(url.href,'https://seezel.github.io/ocean-hidden-response/assets/social-preview.png');
  assert.equal(url.protocol,'https:');
  const bytes=await readFile(new URL('../assets/social-preview.png',import.meta.url));
  assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);
});
