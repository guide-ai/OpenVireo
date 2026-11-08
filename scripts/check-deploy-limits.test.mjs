import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, truncate, rm, symlink} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {MAX_FILE_BYTES, MAX_FILES, deployLimitIssues, deployLimitsCommand, distFiles} from './check-deploy-limits.mjs';

async function fixture(fn) {
  const root = await mkdtemp(path.join(tmpdir(), 'vireo-deploy-limits-'));
  try {await fn(root);} finally {await rm(root, {recursive: true, force: true});}
}

test('the limits are Cloudflare Pages: every file under 25 MiB and fewer than 20000 files', () => {
  assert.equal(MAX_FILE_BYTES, 26214400); assert.equal(MAX_FILES, 20000);
});

test('passes a tree under the limits and reports count, total and largest file', () => fixture(async root => {
  await mkdir(path.join(root, 'assets')); await writeFile(path.join(root, 'index.html'), 'x');
  await writeFile(path.join(root, 'assets/a.js'), 'abc');
  await writeFile(path.join(root, 'big.bin'), ''); await truncate(path.join(root, 'big.bin'), MAX_FILE_BYTES - 1); // sparse
  const lines = [];
  assert.equal(await deployLimitsCommand(root, line => lines.push(line)), 0);
  assert.equal(lines[0], `Deploy limits: 3 files, ${MAX_FILE_BYTES - 1 + 4} bytes (25.0 MiB); largest big.bin, ${MAX_FILE_BYTES - 1} bytes (25.0 MiB).`);
}));

test('fails a file of exactly 25 MiB, a symlink, and a missing directory', () => fixture(async root => {
  await writeFile(path.join(root, 'big.bin'), ''); await truncate(path.join(root, 'big.bin'), MAX_FILE_BYTES);
  await symlink('big.bin', path.join(root, 'link.bin'));
  const lines = [];
  assert.equal(await deployLimitsCommand(root, line => lines.push(line)), 1);
  assert.ok(lines.includes(`  big.bin: ${MAX_FILE_BYTES} bytes (limit: under ${MAX_FILE_BYTES})`));
  assert.ok(lines.includes('  link.bin: not a regular file'));
  assert.equal(await deployLimitsCommand(path.join(root, 'none'), () => {}), 2);
}));

test('fails a file count at the limit', async () => {
  const files = Array.from({length: MAX_FILES}, (_, i) => ({path: `f${i}`, bytes: 1}));
  assert.deepEqual(deployLimitIssues({files, others: []}), [`${MAX_FILES} files (limit: under ${MAX_FILES})`]);
  assert.deepEqual(deployLimitIssues({files: files.slice(1), others: []}), []);
  await fixture(async root => {await mkdir(path.join(root, 'd/e'), {recursive: true}); await writeFile(path.join(root, 'd/e/f'), 'z');
    assert.deepEqual(await distFiles(root), {files: [{path: 'd/e/f', bytes: 1}], others: []});});
});
