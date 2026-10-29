import {createHash} from 'node:crypto';
import {constants} from 'node:fs';
import {readFile, open, stat, lstat, realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export class ResourceManifestError extends Error {
  constructor(field, index) {super(index === undefined ? field : `entry ${index + 1}: ${field}`);}
}
/** Identity only: this source-controlled manifest is not a license or signature. */
export function resourceEntries(manifest) {
  if (!manifest || !Array.isArray(manifest.files) || !manifest.files.length) throw new ResourceManifestError('files must be a nonempty array');
  const seen = new Set();
  return manifest.files.map((entry, index) => {
    if (!entry || typeof entry.path !== 'string' || !/^(data|public\/original)\//.test(entry.path)
      || !/^[A-Za-z0-9 _./-]+$/.test(entry.path) || entry.path.split('/').some(part => !part || part === '.' || part === '..' || /[. ]$/.test(part) || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))) throw new ResourceManifestError('path', index);
    if (!Number.isSafeInteger(entry.bytes) || entry.bytes < 0) throw new ResourceManifestError('bytes', index);
    if (typeof entry.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(entry.sha256)) throw new ResourceManifestError('sha256', index);
    const key = entry.path.toLowerCase();
    if (seen.has(key)) throw new ResourceManifestError('duplicate portable path', index);
    seen.add(key);
    return {path: entry.path, bytes: entry.bytes, sha256: entry.sha256};
  });
}
/** Optional assembled[] (Front G): each whole original file is the in-order concatenation of listed manifest files (its tiles).
 * Every tile belongs to at most one band, and the listed bytes must add up. Validated before any IO. */
export function assembledEntries(manifest, entries = resourceEntries(manifest)) {
  if (manifest?.assembled === undefined) return [];
  if (!Array.isArray(manifest.assembled) || !manifest.assembled.length) throw new ResourceManifestError('assembled must be a nonempty array');
  const byPath = new Map(entries.map(e => [e.path, e])), used = new Set(), names = new Set();
  return manifest.assembled.map((band, index) => {
    const field = name => new ResourceManifestError(`assembled ${name}`, index);
    if (!band || typeof band.name !== 'string' || !/^[A-Za-z0-9_.-]{1,64}$/.test(band.name) || names.has(band.name)) throw field('name');
    names.add(band.name);
    if (!Number.isSafeInteger(band.bytes) || band.bytes < 0) throw field('bytes');
    if (typeof band.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(band.sha256)) throw field('sha256');
    if (!Array.isArray(band.tiles) || !band.tiles.length) throw field('tiles');
    const tiles = band.tiles.map(t => {if (!byPath.has(t) || used.has(t)) throw field('tiles'); used.add(t); return byPath.get(t);});
    if (tiles.reduce((sum, t) => sum + t.bytes, 0) !== band.bytes) throw field('bytes');
    return {name: band.name, bytes: band.bytes, sha256: band.sha256, tiles};
  });
}
const ioReason = code => ({ENOENT: 'missing', ENOTDIR: 'parent is not a directory', ELOOP: 'symlink loop', EACCES: 'permission denied', EPERM: 'permission denied', EISDIR: 'not a regular file'}[code] ?? 'unreadable');
const isFilesystemError = error => typeof error?.code === 'string' && (/^E[A-Z0-9]+$/.test(error.code) || error.code === 'UNKNOWN');
const ioIssue = (entry, error, phase) => ({path: entry.path, reason: phase === 'close' ? 'close failed' : ioReason(error.code), code: error.code});
/** Takes ownership of one opened descriptor; unexpected Node/program errors propagate. */
export async function checkOpenedResource(handle, entry, assembled = null) {
  let result = null;
  try {
    const info = await handle.stat();
    if (!info.isFile()) result = {path: entry.path, reason: 'not a regular file'};
    else if (info.size !== entry.bytes) result = {path: entry.path, reason: 'size mismatch'};
    else {
      const hash = createHash('sha256');
      for await (const chunk of handle.createReadStream({autoClose: false})) {hash.update(chunk); assembled?.update(chunk);}
      if (hash.digest('hex') !== entry.sha256) result = {path: entry.path, reason: 'SHA-256 mismatch'};
    }
  } catch (error) {if (!isFilesystemError(error)) throw error; result = ioIssue(entry, error);}
  finally {
    try {await handle.close();}
    catch (error) {if (!isFilesystemError(error)) throw error; result = ioIssue(entry, error, 'close');}
  }
  return result;
}
async function checkEntry(root, entry, directories, assembled = null) {
  try {
    const parts = entry.path.split('/');
    for (let i = 1; i < parts.length; i++) {
      const dir = path.join(root, ...parts.slice(0, i));
      if (!directories.has(dir)) directories.set(dir, lstat(dir).then(info => info.isSymbolicLink() ? 'SYMLINK' : !info.isDirectory() ? 'ENOTDIR' : null));
      const code = await directories.get(dir);
      if (code) return {path: entry.path, reason: code === 'SYMLINK' ? 'resource path is a symlink' : ioReason(code), code};
    }
    const file = path.join(root, entry.path);
    if ((await lstat(file)).isSymbolicLink()) return {path: entry.path, reason: 'resource path is a symlink', code: 'SYMLINK'};
    // NONBLOCK rejects FIFO races; NOFOLLOW rejects a final-component link swap.
    const handle = await open(file, constants.O_RDONLY | constants.O_NONBLOCK | (constants.O_NOFOLLOW ?? 0));
    return await checkOpenedResource(handle, entry, assembled);
  } catch (error) {if (!isFilesystemError(error)) throw error; return ioIssue(entry, error);}
}
async function rootDiagnostics(root, entries) {
  const roots = [...new Set(entries.map(e => e.path.startsWith('data/') ? 'data' : 'public/original'))], issues = [];
  for (const name of roots) {
    let link = false;
    try {
      const file = path.join(root, name); link = (await lstat(file)).isSymbolicLink();
      if (link) {await stat(file); issues.push({path: name, reason: 'resource root is a symlink', code: 'SYMLINK'}); continue;}
      if (!(await stat(file)).isDirectory()) issues.push({path: name, reason: 'resource root is not a directory'});
    } catch (error) {
      if (!isFilesystemError(error)) throw error;
      issues.push({path: name, reason: link && error.code === 'ENOENT' ? 'resource root link target missing' : ioReason(error.code), code: link ? 'SYMLINK' : error.code});
    }
  }
  return issues;
}
export async function checkResources(root, manifest) {
  const entries = resourceEntries(manifest), bands = assembledEntries(manifest, entries); // Validate everything before resource IO.
  const roots = await rootDiagnostics(root, entries), results = new Array(entries.length), directories = new Map();
  // One task per ordinary file; one task per assembled band, which reads its tiles in order and feeds each chunk to both the
  // tile's own hash and the band's hash (the same single read pass, no extra IO).
  const index = new Map(entries.map((e, i) => [e.path, i])), inBand = new Set(bands.flatMap(b => b.tiles.map(t => t.path)));
  const tasks = [...entries.map((e, i) => inBand.has(e.path) ? null : async () => {results[i] = await checkEntry(root, e, directories);}).filter(Boolean),
    ...bands.map(band => async () => {
      const hash = createHash('sha256');let complete = true;
      for (const tile of band.tiles) {const i = index.get(tile.path); results[i] = await checkEntry(root, tile, directories, hash); if (results[i]) complete = false;}
      const digest = hash.digest('hex');
      band.issue = !complete ? {path: band.name, reason: 'assembled band has a missing or changed tile'} : digest !== band.sha256 ? {path: band.name, reason: 'assembled SHA-256 mismatch'} : null;
    })];
  let next = 0;
  const workers = Array.from({length: Math.min(8, tasks.length)}, async () => {while (next < tasks.length) await tasks[next++]();});
  await Promise.all(workers);
  const issues = results.filter(Boolean), bandIssues = bands.map(b => b.issue).filter(Boolean);
  return {total: entries.length, matched: entries.length - issues.length, issues,
    ...(bands.length ? {assembled: {total: bands.length, matched: bands.length - bandIssues.length, issues: bandIssues}} : {}), ...(roots.length ? {roots} : {})};
}
/** docs/RESOURCE-PROVENANCE.json totals must equal the manifest: file count, byte sum and per-extension counts. */
export function provenanceTotalIssues(manifest, provenance) {
  const entries = resourceEntries(manifest), issues = [];
  const bytes = entries.reduce((sum, e) => sum + e.bytes, 0), ext = {};
  for (const e of entries) {const x = path.extname(e.path); ext[x] = (ext[x] ?? 0) + 1;}
  if (provenance?.totalFiles !== entries.length) issues.push(`totalFiles ${provenance?.totalFiles} != ${entries.length}`);
  if (provenance?.totalBytes !== bytes) issues.push(`totalBytes ${provenance?.totalBytes} != ${bytes}`);
  const recorded = provenance?.extensions ?? {};
  for (const x of new Set([...Object.keys(ext), ...Object.keys(recorded)])) if (recorded[x] !== ext[x]) issues.push(`extensions ${x} ${recorded[x]} != ${ext[x] ?? 0}`);
  // Each group's file count and byte sum must equal the manifest entries under its path prefix, and groups must cover every entry.
  const groups = provenance?.groups ?? {}, covered = new Set();
  for (const [prefix, group] of Object.entries(groups)) {
    const mine = entries.filter(e => e.path.startsWith(prefix + '/'));
    for (const e of mine) covered.add(e.path);
    const sum = mine.reduce((total, e) => total + e.bytes, 0);
    if (group?.files !== mine.length) issues.push(`groups ${prefix} files ${group?.files} != ${mine.length}`);
    if (group?.bytes !== sum) issues.push(`groups ${prefix} bytes ${group?.bytes} != ${sum}`);
  }
  if (Object.keys(groups).length && covered.size !== entries.length) issues.push(`groups cover ${covered.size} of ${entries.length} entries`);
  // Front G: the assembled bands' count and byte sum are recorded too, and every band's tiles lie in one recorded group.
  const bands = assembledEntries(manifest, entries);
  if (bands.length || provenance?.assembledFiles !== undefined) {
    const sum = bands.reduce((total, b) => total + b.bytes, 0);
    if (provenance?.assembledFiles !== bands.length) issues.push(`assembledFiles ${provenance?.assembledFiles} != ${bands.length}`);
    if (provenance?.assembledBytes !== sum) issues.push(`assembledBytes ${provenance?.assembledBytes} != ${sum}`);
    for (const b of bands) if (!Object.keys(groups).some(prefix => b.tiles.every(t => t.path.startsWith(prefix + '/')))) issues.push(`assembled ${b.name} tiles are not in one group`);
  }
  return issues;
}
export async function resourceCheckCommand(root, args = [], output = console.log) {
  if (args.length) {output('Usage: node scripts/check-resources.mjs'); return 2;}
  let text, manifest, report;
  try {text = await readFile(path.join(root, 'docs/LOCAL-RESOURCES.json'), 'utf8');}
  catch (error) {if (!isFilesystemError(error)) throw error; output(`Resource manifest unavailable (${error.code}). See docs/LOCAL-RESOURCES.json.`); return 2;}
  try {manifest = JSON.parse(text);}
  catch (error) {if (!(error instanceof SyntaxError)) throw error; output('Resource manifest contains malformed JSON.'); return 2;}
  try {report = await checkResources(root, manifest);}
  catch (error) {if (!(error instanceof ResourceManifestError)) throw error; output(`Resource manifest invalid: ${error.message}.`); return 2;}
  output(`Local scientific resources: ${report.matched}/${report.total} match size and SHA-256.`);
  if (report.assembled) output(`Assembled original files: ${report.assembled.matched}/${report.assembled.total} equal the concatenation of their tiles.`);
  let totals = [];
  try {totals = provenanceTotalIssues(manifest, JSON.parse(await readFile(path.join(root, 'docs/RESOURCE-PROVENANCE.json'), 'utf8')));}
  catch (error) {if (!isFilesystemError(error) && !(error instanceof SyntaxError)) throw error; totals = error.code === 'ENOENT' ? [] : ['docs/RESOURCE-PROVENANCE.json unreadable'];}
  for (const issue of totals) output(`  RESOURCE-PROVENANCE.json: ${issue}`);
  for (const issue of report.assembled?.issues ?? []) output(`  ${issue.path}: ${issue.reason}`);
  if (!report.issues.length && !report.assembled?.issues.length) return totals.length ? 1 : 0;
  for (const issue of report.roots ?? []) output(`  ${issue.path}: ${issue.reason}${issue.code ? ` (${issue.code})` : ''}`);
  for (const issue of report.issues.slice(0, 20)) output(`  ${issue.path}: ${issue.reason}${issue.code ? ` (${issue.code})` : ''}`);
  if (report.issues.length > 20) output(`  ... ${report.issues.length - 20} additional resource issues.`);
  output('Restore missing or changed versioned resources from the matching source revision.');
  output('See README.md and docs/LOCAL-RESOURCES.json. Nothing was downloaded, generated or changed.');
  return 1;
}
const ownFile = await realpath(fileURLToPath(import.meta.url));
const invoked = process.argv[1] ? await realpath(process.argv[1]).catch(() => null) : null;
if (invoked === ownFile) process.exitCode = await resourceCheckCommand(path.resolve(path.dirname(ownFile), '..'), process.argv.slice(2));
