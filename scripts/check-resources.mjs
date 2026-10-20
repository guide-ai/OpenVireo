import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readFile, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

/** Identity check only. The manifest is not a license, signature or source oracle. */
export function resourceEntries(manifest) {
  if (!manifest || !Array.isArray(manifest.files) || !manifest.files.length) throw new Error('Invalid resource manifest');
  const seen = new Set();
  return manifest.files.map(entry => {
    if (!entry || typeof entry.path !== 'string' || !/^(data|public\/original)\//.test(entry.path)
      || /[\\\x00-\x1f\x7f:]/.test(entry.path) || entry.path.split('/').some(part => !part || part === '.' || part === '..')
      || !Number.isSafeInteger(entry.bytes) || entry.bytes < 0 || !/^[a-f0-9]{64}$/.test(entry.sha256)
      || seen.has(entry.path)) throw new Error('Invalid resource manifest entry');
    seen.add(entry.path);
    return {path: entry.path, bytes: entry.bytes, sha256: entry.sha256};
  });
}

export async function checkResources(root, manifest) {
  const entries = resourceEntries(manifest); // Validate every path before any resource IO.
  const issues = [];
  let matched = 0;
  for (const entry of entries) {
    const file = path.join(root, entry.path);
    try {
      const info = await stat(file);
      if (!info.isFile()) {issues.push({path: entry.path, reason: 'not a regular file'}); continue;}
      if (info.size !== entry.bytes) {issues.push({path: entry.path, reason: 'size mismatch'}); continue;}
      const hash = createHash('sha256');
      for await (const chunk of createReadStream(file)) hash.update(chunk);
      if (hash.digest('hex') !== entry.sha256) {issues.push({path: entry.path, reason: 'SHA-256 mismatch'}); continue;}
      matched++;
    } catch (error) {
      issues.push({path: entry.path, reason: error?.code === 'ENOENT' ? 'missing' : 'unreadable'});
    }
  }
  return {total: entries.length, matched, issues};
}

export async function resourceCheckCommand(root, args = [], output = console.log) {
  if (args.length) {output('Usage: node scripts/check-resources.mjs'); return 2;}
  let report;
  try {
    const manifest = JSON.parse(await readFile(path.join(root, 'docs/LOCAL-RESOURCES.json'), 'utf8'));
    report = await checkResources(root, manifest);
  } catch {
    output('Resource manifest unavailable or invalid. Restore docs/LOCAL-RESOURCES.json from this source revision.');
    return 2;
  }
  output(`Local scientific resources: ${report.matched}/${report.total} match size and SHA-256.`);
  if (!report.issues.length) return 0;
  for (const issue of report.issues.slice(0, 20)) output(`  ${issue.path}: ${issue.reason}`);
  if (report.issues.length > 20) output(`  ... ${report.issues.length - 20} additional resource issues.`);
  output('Build and data-dependent tests require the matching authorized private resource pack.');
  output('See README.md and docs/LOCAL-RESOURCES.json. Nothing was downloaded, generated or changed.');
  return 1;
}

const ownFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === ownFile) {
  process.exitCode = await resourceCheckCommand(path.resolve(path.dirname(ownFile), '..'), process.argv.slice(2));
}
