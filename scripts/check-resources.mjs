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
      || /[\\\x00-\x1f\x7f:]|\p{Cf}/u.test(entry.path) || entry.path.split('/').some(part => !part || part === '.' || part === '..')) throw new ResourceManifestError('path', index);
    if (!Number.isSafeInteger(entry.bytes) || entry.bytes < 0) throw new ResourceManifestError('bytes', index);
    if (typeof entry.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(entry.sha256)) throw new ResourceManifestError('sha256', index);
    const key = entry.path.normalize('NFC').toLowerCase();
    if (seen.has(key)) throw new ResourceManifestError('duplicate portable path', index);
    seen.add(key);
    return {path: entry.path, bytes: entry.bytes, sha256: entry.sha256};
  });
}
const ioReason = code => ({ENOENT: 'missing', ENOTDIR: 'parent is not a directory', ELOOP: 'symlink loop', EACCES: 'permission denied', EPERM: 'permission denied', EISDIR: 'not a regular file'}[code] ?? 'unreadable');
async function checkEntry(root, entry) {
  let handle;
  try {
    // NONBLOCK prevents opening a FIFO from hanging before fstat can reject it.
    // One descriptor binds the type/size check and stream to the same open file.
    handle = await open(path.join(root, entry.path), constants.O_RDONLY | constants.O_NONBLOCK);
    const info = await handle.stat();
    if (!info.isFile()) return {path: entry.path, reason: 'not a regular file'};
    if (info.size !== entry.bytes) return {path: entry.path, reason: 'size mismatch'};
    const hash = createHash('sha256');
    for await (const chunk of handle.createReadStream({autoClose: false})) hash.update(chunk);
    return hash.digest('hex') === entry.sha256 ? null : {path: entry.path, reason: 'SHA-256 mismatch'};
  } catch (error) {
    if (typeof error?.code !== 'string') throw error;
    return {path: entry.path, reason: ioReason(error.code), code: error.code};
  } finally {await handle?.close();}
}
async function rootDiagnostics(root, entries) {
  const roots = [...new Set(entries.map(e => e.path.startsWith('data/') ? 'data' : 'public/original'))], issues = [];
  for (const name of roots) {
    let link = false;
    try {
      const file = path.join(root, name); link = (await lstat(file)).isSymbolicLink();
      if (!(await stat(file)).isDirectory()) issues.push({path: name, reason: 'resource root is not a directory'});
    } catch (error) {
      if (typeof error?.code !== 'string') throw error;
      issues.push({path: name, reason: link && error.code === 'ENOENT' ? 'resource root link target missing' : ioReason(error.code), code: error.code});
    }
  }
  return issues;
}
export async function checkResources(root, manifest) {
  const entries = resourceEntries(manifest); // Validate every entry before resource IO.
  const roots = await rootDiagnostics(root, entries), results = new Array(entries.length);
  let next = 0;
  const workers = Array.from({length: Math.min(8, entries.length)}, async () => {
    while (next < entries.length) {const i = next++; results[i] = await checkEntry(root, entries[i]);}
  });
  await Promise.all(workers);
  const issues = results.filter(Boolean);
  return {total: entries.length, matched: entries.length - issues.length, issues, ...(roots.length ? {roots} : {})};
}
export async function resourceCheckCommand(root, args = [], output = console.log) {
  if (args.length) {output('Usage: node scripts/check-resources.mjs'); return 2;}
  let text, manifest, report;
  try {text = await readFile(path.join(root, 'docs/LOCAL-RESOURCES.json'), 'utf8');}
  catch (error) {if (typeof error?.code !== 'string') throw error; output(`Resource manifest unavailable (${error.code}). See docs/LOCAL-RESOURCES.json.`); return 2;}
  try {manifest = JSON.parse(text);}
  catch (error) {if (!(error instanceof SyntaxError)) throw error; output('Resource manifest contains malformed JSON.'); return 2;}
  try {report = await checkResources(root, manifest);}
  catch (error) {if (!(error instanceof ResourceManifestError)) throw error; output(`Resource manifest invalid: ${error.message}.`); return 2;}
  output(`Local scientific resources: ${report.matched}/${report.total} match size and SHA-256.`);
  if (!report.issues.length) return 0;
  for (const issue of report.roots ?? []) output(`  ${issue.path}: ${issue.reason}${issue.code ? ` (${issue.code})` : ''}`);
  for (const issue of report.issues.slice(0, 20)) output(`  ${issue.path}: ${issue.reason}${issue.code ? ` (${issue.code})` : ''}`);
  if (report.issues.length > 20) output(`  ... ${report.issues.length - 20} additional resource issues.`);
  output('Build and data-dependent tests require the matching authorized private resource pack.');
  output('See README.md and docs/LOCAL-RESOURCES.json. Nothing was downloaded, generated or changed.');
  return 1;
}
const ownFile = await realpath(fileURLToPath(import.meta.url));
const invoked = process.argv[1] ? await realpath(process.argv[1]).catch(() => null) : null;
if (invoked === ownFile) process.exitCode = await resourceCheckCommand(path.resolve(path.dirname(ownFile), '..'), process.argv.slice(2));
