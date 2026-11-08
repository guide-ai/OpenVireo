// Front REL1 [W]: the static release goes to Cloudflare Pages by direct upload (user decision of 2026-11-07, docs/DEPLOY.md).
// Pages refuses a deployment with any file of 25 MiB or more, or with 20000 files or more (the free plan's file count). This
// check fails the build before an upload could fail. It reads only file sizes under the output directory; nothing is sent.
// Usage: node scripts/check-deploy-limits.mjs [distDir]   (default: dist)
import {lstat, readdir, realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const MAX_FILE_BYTES = 25 * 1024 * 1024; // 26214400: a file must be strictly smaller.
export const MAX_FILES = 20000; // the count must be strictly smaller.

/** Every regular file under `dir` with its size, in a stable order. Symlinks and other entries are reported, not followed. */
export async function distFiles(dir) {
  const files = [], others = [];
  async function walk(rel) {
    const items = await readdir(path.join(dir, rel), {withFileTypes: true});
    for (const item of items.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
      const child = rel ? `${rel}/${item.name}` : item.name;
      if (item.isDirectory()) await walk(child);
      else if (item.isFile()) files.push({path: child, bytes: (await lstat(path.join(dir, child))).size});
      else others.push(child);
    }
  }
  await walk('');
  return {files, others};
}
export function deployLimitIssues({files, others}, limits = {maxFileBytes: MAX_FILE_BYTES, maxFiles: MAX_FILES}) {
  const issues = [];
  for (const f of files) if (f.bytes >= limits.maxFileBytes) issues.push(`${f.path}: ${f.bytes} bytes (limit: under ${limits.maxFileBytes})`);
  if (files.length >= limits.maxFiles) issues.push(`${files.length} files (limit: under ${limits.maxFiles})`);
  for (const o of others) issues.push(`${o}: not a regular file`);
  return issues;
}
const mib = bytes => `${(bytes / 1048576).toFixed(1)} MiB`;
export async function deployLimitsCommand(dir, output = console.log) {
  let listing;
  try {listing = await distFiles(dir);}
  catch (error) {if (typeof error?.code !== 'string') throw error; output(`Deploy limits: ${dir} unreadable (${error.code}). Run vite build first.`); return 2;}
  const {files} = listing, total = files.reduce((sum, f) => sum + f.bytes, 0);
  const largest = files.reduce((max, f) => !max || f.bytes > max.bytes ? f : max, null);
  output(`Deploy limits: ${files.length} files, ${total} bytes (${mib(total)}); largest ${largest ? `${largest.path}, ${largest.bytes} bytes (${mib(largest.bytes)})` : 'none'}.`);
  const issues = deployLimitIssues(listing);
  if (!issues.length) {output(`Every file is under ${MAX_FILE_BYTES} bytes and the count is under ${MAX_FILES}.`); return 0;}
  for (const issue of issues) output(`  ${issue}`);
  output('Split large files into byte-range tiles recorded in docs/LOCAL-RESOURCES.json (assembled[]), as the GSC and ObjX_MPC.CMO are.');
  return 1;
}
const ownFile = await realpath(fileURLToPath(import.meta.url));
const invoked = process.argv[1] ? await realpath(process.argv[1]).catch(() => null) : null;
if (invoked === ownFile) {
  const args = process.argv.slice(2);
  if (args.length > 1) {console.log('Usage: node scripts/check-deploy-limits.mjs [distDir]'); process.exitCode = 2;}
  else process.exitCode = await deployLimitsCommand(path.resolve(args[0] ?? 'dist'));
}
