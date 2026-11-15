import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
  .split('\0').filter(Boolean);

const forbiddenPaths = [
  /(?:^|\/)(?:AGENTS|CODEX|CLAUDE|GEMINI)\.md$/i,
  /(?:^|\/)\.(?:codex|claude|agents|cursor|windsurf)(?:\/|$)/i,
  /(?:^|\/)(?:\.env(?:\..*)?|\.netrc|_netrc|\.cdsapirc|id_rsa|id_ed25519|credentials\.json|service[-_]account[^/]*\.json)$/i,
  /\.(?:pem|p12|pfx|key)$/i,
  /^(?:DESIGN|PRODUCT)\.md$/i,
  /^docs\/(?:.*-task|.*-audit|.*-ledger|website-enhancement-design|website-v4-integration-status|submission-alignment-v3|deck-report|geography-report|ui-report)\.md$/i,
  /^artifacts\/submission\/(?:submission-draft.*\.md|demo\.(?:pdf|pptx))$/i,
  /^prototypes\//,
  /^tools\/(?:make-deck|run-v4-browser-tests)\.mjs$/,
];
const textPath = /(?:\.(?:md|txt|json|js|mjs|py|html|css|yml|yaml|toml|xml|svg)|(?:^|\/)(?:\.gitignore|\.gitattributes|LICENSE))$/i;
const secretSignatures = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\b(?:ghp_|gho_|ghu_|ghs_|ghr_|github_pat_)[A-Za-z0-9_]{20,}/,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}/,
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
  /Authorization:\s*Bearer\s+[A-Za-z0-9._~+/-]{40,}/i,
];

test('tracked paths contain no credentials, agent instructions, or obsolete review artifacts', () => {
  for (const file of tracked) {
    assert.ok(!forbiddenPaths.some(pattern => pattern.test(file)), 'Nonpublic path is tracked: ' + file);
  }
});

test('tracked text has no obvious credential or private-key signatures', () => {
  for (const file of tracked) {
    if (!textPath.test(file)) continue;
    const content = readFileSync(join(root, file), 'utf8');
    for (const signature of secretSignatures) {
      assert.ok(!signature.test(content), 'Possible secret signature in: ' + file);
    }
  }
});

test('reproduction manifest omits private instructions and obsolete submission drafts', () => {
  const content = readFileSync(join(root, 'science', 'export.py'), 'utf8');
  for (const file of ['PRODUCT.md', 'DESIGN.md', 'docs/website-release-audit.md',
                      'docs/website-enhancement-design.md', 'docs/website-v4-integration-status.md',
                      'docs/submission-alignment-v3.md', 'prototypes/v4/']) {
    assert.ok(!content.includes('"' + file + '"'), 'Internal file in public archive: ' + file);
  }
});
