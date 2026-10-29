import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, mkdir, writeFile, readFile, rm, symlink, copyFile, chmod} from 'node:fs/promises';
import path from 'node:path';
import{spawnSync}from'node:child_process';
import{fileURLToPath}from'node:url';
import {tmpdir} from 'node:os';
import {checkResources, resourceCheckCommand, checkOpenedResource, provenanceTotalIssues, assembledEntries, censusRoots, unlistedResources} from './check-resources.mjs';

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
    await assert.rejects(checkResources(root, {files: [valid, {...valid, path: name}]}),  /files must|entry [0-9]+:/);
  }
  for (const files of [[valid, valid], [{...valid, bytes: -1}], [{...valid, bytes: 1.5}], [{...valid, sha256: 'bad'}], []]) {
    await assert.rejects(checkResources(root, {files}),  /files must|entry [0-9]+:/);
  }
}));

test('resource-directory and file symlinks are refused in a self-contained checkout', () => fixture(async root => {
  const pack = path.join(root, 'private-pack'); await mkdir(pack); await writeFile(path.join(pack, 'a'), 'x');
  await symlink(pack, path.join(root, 'data/pack'), 'dir');
  assert.equal((await checkResources(root, {files: [entry('data/pack/a', 'x')]})).issues[0].code, 'SYMLINK');
  await symlink(path.join(pack, 'a'), path.join(root, 'data/link')); assert.equal((await checkResources(root, {files: [entry('data/link', 'x')]})).issues[0].code, 'SYMLINK');
}));

test('incomplete checkout reports a bounded missing-resource result; command exit status, corrupt manifest and argument handling are explicit', () => fixture(async root => {
  const files = Array.from({length: 25}, (_, i) => entry(`data/${i}.json`, 'x'));
  await writeFile(path.join(root, 'docs/LOCAL-RESOURCES.json'), JSON.stringify({files}));
  let lines = []; assert.equal(await resourceCheckCommand(root, [], line => lines.push(line)), 1);
  assert.equal(lines.filter(line => /: missing \(ENOENT\)$/.test(line)).length, 20); assert.ok(lines.some(line => line.includes('5 additional')));
  assert.ok(lines.some(line => line.includes('0/25'))); assert.ok(lines.some(line => line.includes('Nothing was downloaded')));
  assert.equal(await resourceCheckCommand(root, ['--download'], () => {}), 2);
  await writeFile(path.join(root, 'docs/LOCAL-RESOURCES.json'), '{');
  assert.equal(await resourceCheckCommand(root, [], () => {}), 2);
  await writeFile(path.join(root, 'data/a'), 'x');
  await writeFile(path.join(root, 'docs/LOCAL-RESOURCES.json'), JSON.stringify({files: [entry('data/a', 'x')]}));
  assert.equal(await resourceCheckCommand(root, [], () => {}), 0);
}));

const checkerFile = fileURLToPath(new URL('./check-resources.mjs', import.meta.url));
async function commandFixture(root) {
  await mkdir(path.join(root, 'scripts')); await copyFile(checkerFile, path.join(root, 'scripts/check-resources.mjs'));
  await writeFile(path.join(root, 'docs/LOCAL-RESOURCES.json'), JSON.stringify({files: [entry('data/absent', 'x')]}));
}
test('real CLI through an aliased checkout cannot silently skip a missing-resource check', () => fixture(async root => {
  await commandFixture(root); const alias = root + '-alias'; await symlink(root, alias, 'dir');
  try {const p = spawnSync(process.execPath, [path.join(alias, 'scripts/check-resources.mjs')], {encoding: 'utf8', timeout: 3000}); assert.equal(p.error, undefined); assert.equal(p.status, 1); assert.match(p.stdout, /0\/1 match/);}
  finally {await rm(alias);}
}));
test('all four npm entry commands retain preflight with ignore-scripts and never reach an engine on a missing pack', () => fixture(async root => {
  await commandFixture(root);
  const actual = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  await writeFile(path.join(root, 'package.json'), JSON.stringify({type: 'module', scripts: actual.scripts}));
  const bin = path.join(root, 'node_modules/.bin'); await mkdir(bin, {recursive: true});
  for (const name of ['tsc', 'vite', 'vitest', 'playwright']) {const file = path.join(bin, name); await writeFile(file, '#!/usr/bin/env node\nimport{writeFileSync}from"node:fs";writeFileSync("engine-ran", "bad");process.exit(79);\n'); await chmod(file, 0o755);}
  const control = spawnSync(process.execPath, [path.join(bin, 'tsc')], {cwd: root, encoding: 'utf8', timeout: 3000});
  assert.equal(control.status, 79); assert.equal(await readFile(path.join(root, 'engine-ran'), 'utf8'), 'bad'); await rm(path.join(root, 'engine-ran'));
  for (const command of ['build', 'dev', 'test', 'test:e2e']) {
    const p = spawnSync('npm', ['--ignore-scripts', 'run', command], {cwd: root, encoding: 'utf8', timeout: 30000});
    assert.equal(p.error, undefined); assert.equal(p.status, 1, command); assert.match(p.stdout, /0\/1 match/);
    await assert.rejects(readFile(path.join(root, 'engine-ran')), {code: 'ENOENT'});
  }
}));
test('typed manifest errors reject non-string hashes, portable collisions and invisible diagnostic controls', () => fixture(async root => {
  const a = entry('data/a', 'x');
  for (const sha256 of [[a.sha256], {toString: () => a.sha256}, null, 0]) await assert.rejects(checkResources(root, {files: [{...a, sha256}]}), /entry 1: sha256/);
  for (const name of ['data/A', 'data/\u202ea', 'data/\u200ba']) await assert.rejects(checkResources(root, {files: [a, {...a, path: name}]}), /entry 2:/);
  await assert.rejects(checkResources(root, {files: [{...a, path: 'data/é'}, {...a, path: 'data/e\u0301'}]}), /entry 1: path/);
  await writeFile(path.join(root, 'docs/LOCAL-RESOURCES.json'), JSON.stringify({files: [a, {...a, sha256: []}]}));
  const lines = []; assert.equal(await resourceCheckCommand(root, [], line => lines.push(line)), 2); assert.match(lines[0], /entry 2: sha256/);
}));
test('root and IO diagnostics distinguish broken links, non-directories and unreadable files; results retain manifest order', () => fixture(async root => {
  await rm(path.join(root, 'data'), {recursive: true}); await symlink(path.join(root, 'offline-pack'), path.join(root, 'data'), 'dir');
  const manifest = {files: [entry('data/a', 'x')]}; let r = await checkResources(root, manifest);
  assert.equal(r.roots[0].reason, 'resource root link target missing'); assert.equal(r.issues[0].code, 'SYMLINK');
  await rm(path.join(root, 'data')); await writeFile(path.join(root, 'data'), 'x'); r = await checkResources(root, manifest); assert.equal(r.issues[0].code, 'ENOTDIR');
  await rm(path.join(root, 'data')); await mkdir(path.join(root, 'data')); await writeFile(path.join(root, 'data/a'), 'x'); await chmod(path.join(root, 'data/a'), 0);
  try {if (process.getuid?.() !== 0) {r = await checkResources(root, manifest); assert.equal(r.issues[0].code, 'EACCES');}}
  finally {await chmod(path.join(root, 'data/a'), 0o600);}
  const files = Array.from({length: 24}, (_, i) => entry(`data/missing-${i}`, 'x')); r = await checkResources(root, {files}); assert.deepEqual(r.issues.map(e => e.path), files.map(e => e.path));
}));
test('a special file cannot block the real CLI before its file-type check', () => fixture(async root => {
  await commandFixture(root); const fifo = path.join(root, 'data/absent'); const made = spawnSync('mkfifo', [fifo], {encoding: 'utf8'}); assert.equal(made.status, 0);
  const p = spawnSync(process.execPath, [path.join(root, 'scripts/check-resources.mjs')], {encoding: 'utf8', timeout: 3000}); assert.equal(p.error, undefined); assert.equal(p.status, 1); assert.match(p.stdout, /not a regular file/);
}));


test('manifest paths reject non-ASCII/control/device names instead of claiming a universal Unicode filesystem fold', () => fixture(async root => {
  const a = entry('data/a', 'x');
  for (const name of ['data/\u009b2Ja', 'data/a\u2028b', 'data/a\u2029b', 'data/aux.json', 'data/NUL', 'data/COM1.txt', 'data/a.', 'data/a ', 'data/a?b', 'data/a|b', 'data/AΣ', 'data/aσ', 'data/ﬁ', 'data/é']) await assert.rejects(checkResources(root, {files: [{...a, path: name}]}), /entry 1: path/);
}));
test('opened-file failures preserve descriptor ownership and distinguish programmer errors from stream/close IO errors', async () => {
  const a = entry('data/a', 'x'); let closed = 0;
  const good = () => ({stat: async () => ({isFile: () => true, size: 1}), createReadStream: async function* () {yield Buffer.from('x');}, close: async () => {closed++;}});
  const broken = good(); broken.createReadStream = async function* () {throw Object.assign(new Error('programmer error'), {code: 'ERR_INVALID_ARG_TYPE'});};
  await assert.rejects(checkOpenedResource(broken, a), {code: 'ERR_INVALID_ARG_TYPE'}); assert.equal(closed, 1);
  const io = good(); io.createReadStream = async function* () {throw Object.assign(new Error('read error'), {code: 'EIO'});};
  assert.deepEqual(await checkOpenedResource(io, a), {path: a.path, reason: 'unreadable', code: 'EIO'}); assert.equal(closed, 2);
  const close = good(); close.close = async () => {closed++; throw Object.assign(new Error('close error'), {code: 'EIO'});};
  assert.deepEqual(await checkOpenedResource(close, a), {path: a.path, reason: 'close failed', code: 'EIO'}); assert.equal(closed, 3);
});

test('RESOURCE-PROVENANCE totals must equal the manifest file count, byte sum and extension counts', () => {
  const manifest = {files: [entry('data/a.json', '{}'), entry('data/b.json', '[1]'), entry('public/original/c.DAT', 'xyz')]};
  assert.deepEqual(provenanceTotalIssues(manifest, {totalFiles: 3, totalBytes: 8, extensions: {'.json': 2, '.DAT': 1}}), []);
  assert.deepEqual(provenanceTotalIssues(manifest, {totalFiles: 2, totalBytes: 7, extensions: {'.json': 1, '.SP': 4}}),
    ['totalFiles 2 != 3', 'totalBytes 7 != 8', 'extensions .json 1 != 2', 'extensions .DAT undefined != 1', 'extensions .SP 4 != 0']);
});

test('RESOURCE-PROVENANCE group totals must equal the entries under each prefix and cover every entry', () => {
  const manifest = {files: [entry('data/a/x.json', '{}'), entry('data/a/y.json', '[1]'), entry('data/b/z.json', 'z')]};
  const base = {totalFiles: 3, totalBytes: 6, extensions: {'.json': 3}};
  assert.deepEqual(provenanceTotalIssues(manifest, {...base, groups: {'data/a': {files: 2, bytes: 5}, 'data/b': {files: 1, bytes: 1}}}), []);
  assert.deepEqual(provenanceTotalIssues(manifest, {...base, groups: {'data/a': {files: 2, bytes: 4}}}), ['groups data/a bytes 4 != 5', 'groups cover 2 of 3 entries']);
});

// Front G: assembled[] whole files are the in-order concatenation of their listed tiles (synthetic bytes only).
test('an assembled file equals the in-order concatenation of its tiles; reordered or changed tiles are reported', () => fixture(async root => {
  await mkdir(path.join(root, 'data/t'));
  const a = entry('data/t/000.bin', 'first-'), b = entry('data/t/001.bin', 'second'), c = entry('data/t/x.json', '{}');
  for (const [e, text] of [[a, 'first-'], [b, 'second'], [c, '{}']]) await writeFile(path.join(root, e.path), text);
  const band = {name: 'BAND.DAT', bytes: a.bytes + b.bytes, sha256: digest('first-second'), tiles: [a.path, b.path]};
  const ok = await checkResources(root, {files: [a, b, c], assembled: [band]});
  assert.deepEqual(ok, {total: 3, matched: 3, issues: [], assembled: {total: 1, matched: 1, issues: []}});
  // Every tile still matches, but the listed order does not reassemble the recorded whole file.
  const reordered = await checkResources(root, {files: [a, b, c], assembled: [{...band, tiles: [b.path, a.path]}]});
  assert.equal(reordered.matched, 3); assert.deepEqual(reordered.assembled.issues, [{path: 'BAND.DAT', reason: 'assembled SHA-256 mismatch'}]);
  await writeFile(path.join(root, b.path), 'secend');
  const changed = await checkResources(root, {files: [a, b, c], assembled: [band]});
  assert.deepEqual(changed.issues, [{path: b.path, reason: 'SHA-256 mismatch'}]);
  assert.deepEqual(changed.assembled.issues, [{path: 'BAND.DAT', reason: 'assembled band has a missing or changed tile'}]);
  const lines = []; await mkdir(path.join(root, 'docs'), {recursive: true});
  await writeFile(path.join(root, b.path), 'second');
  await writeFile(path.join(root, 'docs/LOCAL-RESOURCES.json'), JSON.stringify({files: [a, b, c], assembled: [band]}));
  assert.equal(await resourceCheckCommand(root, [], line => lines.push(line)), 0);
  assert.deepEqual(lines, ['Local scientific resources: 3/3 match size and SHA-256.', 'Assembled original files: 1/1 equal the concatenation of their tiles.']);
}));

test('assembled[] is validated before IO: unknown or shared tiles, byte sums, names and hashes', () => {
  const a = entry('data/t/000.bin', 'aa'), b = entry('data/t/001.bin', 'bb'), files = [a, b];
  const band = {name: 'B.DAT', bytes: 4, sha256: digest('aabb'), tiles: [a.path, b.path]};
  assert.equal(assembledEntries({files, assembled: [band]}).length, 1);
  assert.deepEqual(assembledEntries({files}), []);
  for (const assembled of [[], 'x', [{...band, tiles: ['data/t/zz.bin']}], [{...band, tiles: [a.path, a.path]}], [band, {...band, name: 'C.DAT'}],
    [{...band, bytes: 5}], [{...band, sha256: 'bad'}], [band, band], [{...band, name: '../x'}], [{...band, tiles: []}]]) {
    assert.throws(() => assembledEntries({files, assembled}), /assembled/);
  }
});

test('provenance records the assembled files and keeps each band inside one group', () => {
  const a = entry('data/t/000.bin', 'aa'), b = entry('data/t/001.bin', 'bb');
  const manifest = {files: [a, b], assembled: [{name: 'B.DAT', bytes: 4, sha256: digest('aabb'), tiles: [a.path, b.path]}]};
  const provenance = {totalFiles: 2, totalBytes: 4, extensions: {'.bin': 2}, assembledFiles: 1, assembledBytes: 4, groups: {'data/t': {files: 2, bytes: 4}}};
  assert.deepEqual(provenanceTotalIssues(manifest, provenance), []);
  assert.deepEqual(provenanceTotalIssues(manifest, {...provenance, assembledFiles: 2, assembledBytes: 3}), ['assembledFiles 2 != 1', 'assembledBytes 3 != 4']);
  assert.deepEqual(provenanceTotalIssues({files: [a, b]}, provenance), ['assembledFiles 1 != 0', 'assembledBytes 4 != 0']);
  assert.deepEqual(provenanceTotalIssues(manifest, {...provenance, groups: {}}), ['assembled B.DAT tiles are not in one group']);
});

// Front G review 1: a census root must hold only listed files, so an extra tile cannot ship silently.
test('census roots report unlisted files and entries, nested ones included; other directories are not censused', () => fixture(async root => {
  await mkdir(path.join(root, 'data/g/N0000'), {recursive: true}); await mkdir(path.join(root, 'data/other'));
  const a = entry('data/g/N0000/000.bin', 'aa'), b = entry('data/g/REGIONS.BIN', 'bb'), c = entry('data/other/x.json', '{}');
  for (const [e, text] of [[a, 'aa'], [b, 'bb'], [c, '{}']]) await writeFile(path.join(root, e.path), text);
  await writeFile(path.join(root, 'data/other/unlisted.json'), 'not censused');
  const manifest = {files: [a, b, c], censusRoots: ['data/g']};
  assert.deepEqual((await checkResources(root, manifest)).unlisted, []);
  await writeFile(path.join(root, 'data/g/N0000/001.bin'), 'extra'); await mkdir(path.join(root, 'data/g/S0000'));
  await writeFile(path.join(root, 'data/g/S0000/000.bin'), 'extra'); await symlink('000.bin', path.join(root, 'data/g/N0000/link.bin'));
  assert.deepEqual(await unlistedResources(root, manifest), [
    {path: 'data/g/N0000/001.bin', reason: 'not listed in the manifest'},
    {path: 'data/g/N0000/link.bin', reason: 'unlisted non-regular entry'},
    {path: 'data/g/S0000/000.bin', reason: 'not listed in the manifest'}]);
  const lines = [];
  await writeFile(path.join(root, 'docs/LOCAL-RESOURCES.json'), JSON.stringify(manifest));
  assert.equal(await resourceCheckCommand(root, [], line => lines.push(line)), 1);
  assert.ok(lines.includes('Unlisted files under data/g: 3.') && lines.includes('  data/g/S0000/000.bin: not listed in the manifest'));
  assert.equal((await checkResources(root, {files: [a, b, c]})).unlisted, undefined);
}));

test('censusRoots are validated before IO', () => {
  const a = entry('data/g/000.bin', 'aa'), files = [a];
  assert.deepEqual(censusRoots({files, censusRoots: ['data/g']}), ['data/g']);
  assert.deepEqual(censusRoots({files}), []);
  for (const roots of [[], 'data', ['../x'], ['data/../g'], ['public/private'], ['data/g', 'data/g'], ['data/none'], ['/data/g'], [3]]) {
    assert.throws(() => censusRoots({files, censusRoots: roots}), /censusRoots/);
  }
});
