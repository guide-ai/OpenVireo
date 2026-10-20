import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, mkdir, writeFile, readFile, rm, symlink} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {checkResources, resourceCheckCommand} from './check-resources.mjs';

const digest = text => createHash('sha256').update(text).digest('hex');
const entry = (name, text) => ({path: name, bytes: Buffer.byteLength(text), sha256: digest(text)});
async function fixture(fn) {
  const root = await mkdtemp(path.join(tmpdir(), 'vireo-resource-check-'));
  try {await mkdir(path.join(root, 'docs')); await mkdir(path.join(root, 'data')); await fn(root);}
  finally {await rm(root, {recursive: true, force: true});}
}

test('valid UTF-8 bytes pass; same-size corruption, wrong size, missing and non-file resources are distinguished without writes', () => fixture(async root => {
  // Synthetic checker inputs, never original or acquired scientific data.
  const a = entry('data/a.json', 'λ-test'), b = entry('data/b.json', 'other');
  await writeFile(path.join(root, a.path), 'λ-test'); await writeFile(path.join(root, b.path), 'other');
  assert.deepEqual(await checkResources(root, {files: [a, b]}), {total: 2, matched: 2, issues: []});
  await writeFile(path.join(root, b.path), 'alter');
  assert.deepEqual((await checkResources(root, {files: [a, b]})).issues, [{path: b.path, reason: 'SHA-256 mismatch'}]);
  assert.equal(await readFile(path.join(root, b.path), 'utf8'), 'alter');
  await writeFile(path.join(root, b.path), 'x');
  assert.equal((await checkResources(root, {files: [b]})).issues[0].reason, 'size mismatch');
  await rm(path.join(root, b.path));
  assert.equal((await checkResources(root, {files: [b]})).issues[0].reason, 'missing');
  await mkdir(path.join(root, b.path));
  assert.equal((await checkResources(root, {files: [b]})).issues[0].reason, 'not a regular file');
}));

test('manifest rejects traversal, absolute/control paths, duplicates and malformed sizes/hashes before resource IO', () => fixture(async root => {
  const valid = entry('data/a.json', 'x');
  for (const name of ['../secret', '/data/a', 'data/../a', 'data//a', 'data/./a', 'data/a\n', 'data/a\\b', 'public/private/a', 'data/C:a']) {
    await assert.rejects(checkResources(root, {files: [valid, {...valid, path: name}]}), /Invalid resource manifest/);
  }
  for (const files of [[valid, valid], [{...valid, bytes: -1}], [{...valid, bytes: 1.5}], [{...valid, sha256: 'bad'}], []]) {
    await assert.rejects(checkResources(root, {files}), /Invalid resource manifest/);
  }
}));

test('authorized local resource-directory symlink retains content checking', () => fixture(async root => {
  const pack = path.join(root, 'private-pack'); await mkdir(pack); await writeFile(path.join(pack, 'a'), 'x');
  await symlink(pack, path.join(root, 'data/pack'), 'dir');
  assert.equal((await checkResources(root, {files: [entry('data/pack/a', 'x')]})).matched, 1);
}));

test('source-only checkout reports a bounded missing-pack result; command exit status, corrupt manifest and argument handling are explicit', () => fixture(async root => {
  const files = Array.from({length: 25}, (_, i) => entry(`data/${i}.json`, 'x'));
  await writeFile(path.join(root, 'docs/LOCAL-RESOURCES.json'), JSON.stringify({files}));
  let lines = []; assert.equal(await resourceCheckCommand(root, [], line => lines.push(line)), 1);
  assert.equal(lines.filter(line => /: missing$/.test(line)).length, 20); assert.ok(lines.some(line => line.includes('5 additional')));
  assert.ok(lines.some(line => line.includes('0/25'))); assert.ok(lines.some(line => line.includes('Nothing was downloaded')));
  assert.equal(await resourceCheckCommand(root, ['--download'], () => {}), 2);
  await writeFile(path.join(root, 'docs/LOCAL-RESOURCES.json'), '{');
  assert.equal(await resourceCheckCommand(root, [], () => {}), 2);
  await writeFile(path.join(root, 'data/a'), 'x');
  await writeFile(path.join(root, 'docs/LOCAL-RESOURCES.json'), JSON.stringify({files: [entry('data/a', 'x')]}));
  assert.equal(await resourceCheckCommand(root, [], () => {}), 0);
}));
