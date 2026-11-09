// Front SC1 (plan analysis/front-plans/front-i18n-scripts.md § 5): deterministic test fonts for the script checks.
// Writes a private fontconfig (default ~/.cache/openvireo-test-fonts/<profile>/fonts.conf) whose font folder holds symlinks
// to an exact list of system font files, so a Chromium started with FONTCONFIG_FILE pointing at it sees only those fonts,
// whatever else the machine (or the CI runner, which has IPA Gothic, WenQuanYi and Unifont from Playwright's --with-deps)
// has installed. Nothing is downloaded or installed: a missing font fails with a typed message naming the package to install.
//   node scripts/test-fonts.mjs                  profile "scripts": DejaVu (Latin, Cyrillic) + Noto Sans CJK + Noto Sans Devanagari
//   node scripts/test-fonts.mjs --profile=dejavu the DejaVu-only fontconfig docs/I18N.md asks the Spanish layout checks to use
//   --json                                       prints the report as JSON on stdout (the human log goes to stderr)
// Environment: OPENVIREO_TEST_FONTS_DIR (output root), OPENVIREO_TEST_FONT_DIRS (colon-separated folders searched first).
import {createHash} from 'node:crypto';
import {execFileSync, spawnSync} from 'node:child_process';
import {createReadStream, existsSync, lstatSync, mkdirSync, readdirSync, readlinkSync, renameSync, statSync, symlinkSync, unlinkSync, writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

/** Folders searched, in order: Debian/Ubuntu packages, then Arch packages. */
export const SYSTEM_FONT_DIRS = Object.freeze([
  '/usr/share/fonts/opentype/noto', '/usr/share/fonts/truetype/noto', '/usr/share/fonts/truetype/dejavu',
  '/usr/share/fonts/noto-cjk', '/usr/share/fonts/noto', '/usr/share/fonts/TTF',
]);

// Regular and Bold only: they are what Ubuntu 24.04's fonts-dejavu-core and fonts-noto-cjk ship, so Arch and CI resolve the
// same faces by name (no Medium, Light or Oblique; italic stays upright under the site's font-synthesis:none). Not the same
// bytes: on noble the six DejaVu files hash differently and Noto Sans Devanagari is another version; only the two Noto Sans
// CJK collections are byte-identical. The hash log says which bytes a run used.
const DEJAVU = [
  {family: 'DejaVu Sans', files: ['DejaVuSans.ttf', 'DejaVuSans-Bold.ttf']},
  {family: 'DejaVu Serif', files: ['DejaVuSerif.ttf', 'DejaVuSerif-Bold.ttf']},
  {family: 'DejaVu Sans Mono', files: ['DejaVuSansMono.ttf', 'DejaVuSansMono-Bold.ttf']},
];
const CJK_FILES = ['NotoSansCJK-Regular.ttc', 'NotoSansCJK-Bold.ttc'];
export const PROFILES = Object.freeze({
  dejavu: Object.freeze({fonts: DEJAVU, langs: []}),
  scripts: Object.freeze({
    fonts: [...DEJAVU,
      {family: 'Noto Sans CJK JP', files: CJK_FILES},
      {family: 'Noto Sans CJK SC', files: CJK_FILES},
      {family: 'Noto Sans CJK TC', files: CJK_FILES},
      {family: 'Noto Sans Devanagari', files: ['NotoSansDevanagari-Regular.ttf', 'NotoSansDevanagari-Bold.ttf']}],
    // The other faces the two CJK collections hold; fc-list shows them, and any family beyond these is an error.
    alsoListed: ['Noto Sans CJK HK', 'Noto Sans CJK KR', ...['HK', 'JP', 'KR', 'SC', 'TC'].map(r => `Noto Sans Mono CJK ${r}`)],
    // A pattern whose language contains one of these tags gets the family appended after the generic one, so fallback for
    // a character DejaVu lacks picks the regional Han design (Han unification, plan § 2.2) instead of any CJK face.
    // Both the fontconfig territory forms and the BCP 47 script forms are listed, since Chromium may pass either.
    langs: [
      {family: 'Noto Sans CJK JP', tags: ['ja']},
      {family: 'Noto Sans CJK SC', tags: ['zh-cn', 'zh-sg', 'zh-hans']},
      {family: 'Noto Sans CJK TC', tags: ['zh-tw', 'zh-hk', 'zh-mo', 'zh-hant']},
      {family: 'Noto Sans Devanagari', tags: ['hi']},
    ],
  }),
});

/** Packages that provide the files, by distribution; printed, never run. */
export const INSTALL_HINTS = Object.freeze({
  'DejaVu Sans': {ubuntu: 'fonts-dejavu-core', arch: 'ttf-dejavu'},
  'DejaVu Serif': {ubuntu: 'fonts-dejavu-core', arch: 'ttf-dejavu'},
  'DejaVu Sans Mono': {ubuntu: 'fonts-dejavu-mono', arch: 'ttf-dejavu'}, // a separate package since Ubuntu 24.04
  'Noto Sans CJK JP': {ubuntu: 'fonts-noto-cjk', arch: 'noto-fonts-cjk'},
  'Noto Sans CJK SC': {ubuntu: 'fonts-noto-cjk', arch: 'noto-fonts-cjk'},
  'Noto Sans CJK TC': {ubuntu: 'fonts-noto-cjk', arch: 'noto-fonts-cjk'},
  'Noto Sans Devanagari': {ubuntu: 'fonts-noto-core', arch: 'noto-fonts'},
});

export class TestFontsError extends Error {
  /** @param {'missing-font'|'fontconfig-tools'|'unresolved-family'|'extra-family'|'wrong-fallback'|'foreign-file'|'profile'} code */
  constructor(code, message) {super(message); this.name = 'TestFontsError'; this.code = code;}
}

const xml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function profileOf(name) {
  if (!Object.hasOwn(PROFILES, name)) throw new TestFontsError('profile', `Unknown test-font profile "${name}" (expected ${Object.keys(PROFILES).join(' or ')}).`);
  return PROFILES[name];
}

/** The unique file names a profile needs, in a stable order. */
export const profileFiles = profile => [...new Set(profile.fonts.flatMap(f => f.files))];

/** Finds each file in the first folder that has it. Returns {found: Map(name → absolute path), missing: [{family, file}]}. */
export function locateFonts(profile, dirs, exists = existsSync) {
  const found = new Map(), missing = [];
  for (const file of profileFiles(profile)) {
    const dir = dirs.find(d => exists(path.join(d, file)));
    if (dir) found.set(file, path.join(dir, file));
  }
  for (const {family, files} of profile.fonts) for (const file of files) if (!found.has(file) && !missing.some(m => m.file === file)) missing.push({family, file});
  return {found, missing};
}

/** The typed failure message for missing files: what is missing, where it looked, and the install command per distribution. */
export function missingFontsMessage(missing, dirs) {
  const families = [...new Set(missing.map(m => m.family))];
  const pkgs = key => [...new Set(families.map(f => INSTALL_HINTS[f][key]))].join(' ');
  return [
    `Test fonts missing: ${missing.map(m => `${m.file} (${m.family})`).join(', ')}.`,
    `Searched: ${dirs.join(', ')}.`,
    'Install them with the system package manager, then run this again:',
    `  Debian/Ubuntu: sudo apt-get install -y ${pkgs('ubuntu')}`,
    `  Arch: sudo pacman -S --needed ${pkgs('arch')}`,
    'Or add the folder that holds them to OPENVIREO_TEST_FONT_DIRS (colon-separated).',
  ].join('\n');
}

const GENERICS = [['sans-serif', 'DejaVu Sans'], ['sans', 'DejaVu Sans'], ['system-ui', 'DejaVu Sans'], ['serif', 'DejaVu Serif'],
  ['monospace', 'DejaVu Sans Mono'], ['mono', 'DejaVu Sans Mono']];

/** The fontconfig XML: only fontDir, a private cache, generic aliases to DejaVu and the per-language fallback rules. */
export function fontsConf({fontDir, cacheDir, profile}) {
  const lines = [
    '<?xml version="1.0"?>',
    '<!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">',
    '<!-- Generated by scripts/test-fonts.mjs (OpenVireo Front SC1). Do not edit: run the script again. -->',
    '<fontconfig>',
    `  <dir>${xml(fontDir)}</dir>`,
    `  <cachedir>${xml(cacheDir)}</cachedir>`,
    '  <config><rescan><int>0</int></rescan></config>',
  ];
  // fontconfig 2.17+ canonicalizes the CSS generic names (sans-serif → sans, monospace → mono); 2.15 (Ubuntu 24.04) does not.
  for (const [generic, family] of GENERICS) lines.push(`  <alias binding="strong"><family>${generic}</family><prefer><family>${family}</family></prefer></alias>`);
  // compare="contains" is a case-insensitive substring test (hi would also match hif, hil or ja-Hira; ja would match jam):
  // harmless with the tags the site sets.
  for (const {family, tags} of profile.langs) for (const tag of tags) lines.push(
    `  <match target="pattern"><test name="lang" compare="contains"><string>${xml(tag)}</string></test>` +
    `<edit name="family" mode="append_last" binding="strong"><string>${xml(family)}</string></edit></match>`);
  lines.push('</fontconfig>', '');
  return lines.join('\n');
}

export const defaultOutputRoot = (env = process.env) => env.OPENVIREO_TEST_FONTS_DIR || path.join(homedir(), '.cache', 'openvireo-test-fonts');
export const searchDirs = (env = process.env) => [...(env.OPENVIREO_TEST_FONT_DIRS || '').split(':').filter(Boolean), ...SYSTEM_FONT_DIRS];

function sha256(file) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    createReadStream(file).on('error', reject).on('data', chunk => hash.update(chunk)).on('end', () => resolve(hash.digest('hex')));
  });
}

/** Points fontDir/<name> at each target; removes stale symlinks it owns. Tolerates a concurrent run doing the same.
 * Anything else in the folder (a copied font, a subfolder) is not this script's: it fails instead of deleting it. */
export function linkFonts(fontDir, found) {
  mkdirSync(fontDir, {recursive: true});
  const foreign = readdirSync(fontDir).filter(entry => !lstatSync(path.join(fontDir, entry)).isSymbolicLink());
  if (foreign.length) throw new TestFontsError('foreign-file', `${fontDir} holds ${foreign.join(', ')}, which scripts/test-fonts.mjs did not link; it only holds symlinks. Move them away and run it again.`);
  for (const entry of readdirSync(fontDir)) {
    const p = path.join(fontDir, entry);
    if (found.get(entry) !== readlinkSync(p)) unlinkSync(p);
  }
  for (const [name, target] of found) {
    const p = path.join(fontDir, name);
    if (existsSync(p) && lstatSync(p).isSymbolicLink() && readlinkSync(p) === target) continue;
    try {symlinkSync(target, p);} catch (e) {if (e.code !== 'EEXIST' || readlinkSync(p) !== target) throw e;}
  }
}

function fc(tool, args, confFile) {
  try {
    return execFileSync(tool, args, {encoding: 'utf8', env: {...process.env, FONTCONFIG_FILE: confFile}, stdio: ['ignore', 'pipe', 'pipe']});
  } catch (e) {
    if (e.code === 'ENOENT') throw new TestFontsError('fontconfig-tools', `${tool} was not found: install fontconfig (Debian/Ubuntu: sudo apt-get install -y fontconfig; Arch: sudo pacman -S --needed fontconfig).`);
    throw e;
  }
}

/** The families fc-list shows that the profile does not expect: a font that is not the profile's reached the config. */
export const extraFamilies = (profile, listed) => [...listed].filter(f => !profile.fonts.some(p => p.family === f) && !(profile.alsoListed ?? []).includes(f)).sort();

/** Checks with fc-list that each family resolves inside the private config and nothing else does, and with fc-match -s
 * that the first CJK or Devanagari face in a language's fallback order is the expected one (what Chromium's
 * per-character fallback walks). */
export function verifyFontconfig(profile, confFile) {
  const listed = new Set(fc('fc-list', ['--format', '%{family}\n'], confFile).split('\n').flatMap(l => l.split(',')).map(s => s.trim()).filter(Boolean));
  const unresolved = [...new Set(profile.fonts.map(f => f.family))].filter(f => !listed.has(f));
  if (unresolved.length) throw new TestFontsError('unresolved-family', `fontconfig does not list ${unresolved.join(', ')} in ${confFile}; listed: ${[...listed].sort().join(', ') || 'nothing'}.`);
  const extra = extraFamilies(profile, listed);
  if (extra.length) throw new TestFontsError('extra-family', `fontconfig lists ${extra.join(', ')} in ${confFile}, which the profile does not hold.`);
  const checks = [];
  for (const {family, tags} of profile.langs) for (const tag of tags) {
    const order = fc('fc-match', ['-s', '--format', '%{family[0]}\n', `sans-serif:lang=${tag}`], confFile).split('\n').filter(Boolean);
    const first = order.find(f => f.startsWith('Noto Sans CJK') || f === 'Noto Sans Devanagari');
    if (order[0] !== 'DejaVu Sans' || first !== family) throw new TestFontsError('wrong-fallback', `fc-match -s sans-serif:lang=${tag} gives ${order.slice(0, 4).join(' > ')}; expected DejaVu Sans first and ${family} as the first script face.`);
    checks.push({lang: tag, first: order[0], scriptFace: first});
  }
  return checks;
}

/** 16 hex digits of the SHA-256 of the (name, sha256) list: the private cache folder for exactly these bytes. */
export const cacheDigest = files => createHash('sha256').update(JSON.stringify(files.map(f => [f.name, f.sha256]))).digest('hex').slice(0, 16);

/** Generates and verifies the fontconfig; returns the report (also written as report.json beside fonts.conf). */
export async function prepareTestFonts({profileName = 'scripts', env = process.env, dirs = searchDirs(env)} = {}) {
  const profile = profileOf(profileName);
  const {found, missing} = locateFonts(profile, dirs);
  if (missing.length) throw new TestFontsError('missing-font', missingFontsMessage(missing, dirs));
  const files = [];
  for (const [name, target] of found) files.push({name, path: target, bytes: statSync(target).size, sha256: await sha256(target)});
  // fontconfig trusts a cache while the font folder's mtime is unchanged, and this folder holds symlinks: a package update
  // that replaces a target in place would keep the old metadata. The cache folder is named after the bytes instead.
  const root = path.join(defaultOutputRoot(env), profileName), fontDir = path.join(root, 'fonts');
  const cacheDir = path.join(root, 'cache', cacheDigest(files)), confFile = path.join(root, 'fonts.conf');
  linkFonts(fontDir, found);
  mkdirSync(cacheDir, {recursive: true});
  const tmp = `${confFile}.${process.pid}.tmp`;
  writeFileSync(tmp, fontsConf({fontDir, cacheDir, profile}));
  renameSync(tmp, confFile);
  const fallback = verifyFontconfig(profile, confFile);
  const version = spawnSync('fc-list', ['--version'], {encoding: 'utf8'}).stderr?.trim() || undefined; // fc-list prints it on stderr
  const report = {profile: profileName, fontconfigFile: confFile, fontconfigVersion: version, cacheDir, files, fallback};
  writeFileSync(path.join(root, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  return report;
}

/** The font-hash log lines (plan § 5 and § 12.1): one line per file, so a font package update shows in the CI log. */
export const reportLines = report => [
  `Test fonts (${report.profile}): FONTCONFIG_FILE=${report.fontconfigFile}${report.fontconfigVersion ? ` (${report.fontconfigVersion})` : ''}`,
  ...report.files.map(f => `  ${f.sha256}  ${f.bytes}  ${f.path}`),
  ...report.fallback.map(c => `  lang=${c.lang}: ${c.first}, then ${c.scriptFace}`),
];

async function main(argv) {
  const profileArg = argv.find(a => a.startsWith('--profile='));
  const json = argv.includes('--json');
  try {
    const report = await prepareTestFonts({profileName: profileArg ? profileArg.slice('--profile='.length) : 'scripts'});
    for (const line of reportLines(report)) (json ? process.stderr : process.stdout).write(line + '\n');
    if (json) process.stdout.write(JSON.stringify(report) + '\n');
    return 0;
  } catch (e) {
    if (!(e instanceof TestFontsError)) throw e;
    process.stderr.write(`[${e.code}] ${e.message}\n`);
    return 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await main(process.argv.slice(2));
