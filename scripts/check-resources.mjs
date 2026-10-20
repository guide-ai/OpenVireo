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
const ioReason = code => ({ENOENT: 'missing', ENOTDIR: 'parent is not a directory', ELOOP: 'symlink loop', EACCES: 'permission denied', EPERM: 'permission denied', EISDIR: 'not a regular file'}[code] ?? 'unreadable');
const isFilesystemError = error => typeof error?.code === 'string' && (/^E[A-Z0-9]+$/.test(error.code) || error.code === 'UNKNOWN');
const ioIssue = (entry, error, phase) => ({path: entry.path, reason: phase === 'close' ? 'close failed' : ioReason(error.code), code: error.code});
/** Takes ownership of one opened descriptor; unexpected Node/program errors propagate. */
export async function checkOpenedResource(handle, entry) {
  let result = null;
  try {
    const info = await handle.stat();
    if (!info.isFile()) result = {path: entry.path, reason: 'not a regular file'};
    else if (info.size !== entry.bytes) result = {path: entry.path, reason: 'size mismatch'};
    else {
      const hash = createHash('sha256');
      for await (const chunk of handle.createReadStream({autoClose: false})) hash.update(chunk);
      if (hash.digest('hex') !== entry.sha256) result = {path: entry.path, reason: 'SHA-256 mismatch'};
    }
  } catch (error) {if (!isFilesystemError(error)) throw error; result = ioIssue(entry, error);}
  finally {
    try {await handle.close();}
    catch (error) {if (!isFilesystemError(error)) throw error; result = ioIssue(entry, error, 'close');}
  }
  return result;
}
async function checkEntry(root, entry, directories) {
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
    return await checkOpenedResource(handle, entry);
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
  const entries = resourceEntries(manifest); // Validate every entry before resource IO.
  const roots = await rootDiagnostics(root, entries), results = new Array(entries.length), directories = new Map();
  let next = 0;
  const workers = Array.from({length: Math.min(8, entries.length)}, async () => {
    while (next < entries.length) {const i = next++; results[i] = await checkEntry(root, entries[i], directories);}
  });
  await Promise.all(workers);
  const issues = results.filter(Boolean);
  return {total: entries.length, matched: entries.length - issues.length, issues, ...(roots.length ? {roots} : {})};
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
  if (!report.issues.length) return 0;
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
