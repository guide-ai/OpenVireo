// Front SC1: the test-font generator's XML, file search and typed failure (npm run test:test-fonts).
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {lstat, mkdtemp, readFile, readlink, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {PROFILES, SYSTEM_FONT_DIRS, TestFontsError, fontsConf, locateFonts, missingFontsMessage, prepareTestFonts, profileFiles, profileOf, reportLines, searchDirs} from './test-fonts.mjs';

async function fixture(fn) {
  const root = await mkdtemp(path.join(tmpdir(), 'vireo-test-fonts-'));
  try {await fn(root);} finally {await rm(root, {recursive: true, force: true});}
}

test('the scripts profile needs DejaVu Regular and Bold, both Noto Sans CJK collections once, and Noto Sans Devanagari', () => {
  assert.deepEqual(profileFiles(PROFILES.scripts), ['DejaVuSans.ttf', 'DejaVuSans-Bold.ttf', 'DejaVuSerif.ttf', 'DejaVuSerif-Bold.ttf',
    'DejaVuSansMono.ttf', 'DejaVuSansMono-Bold.ttf', 'NotoSansCJK-Regular.ttc', 'NotoSansCJK-Bold.ttc',
    'NotoSansDevanagari-Regular.ttf', 'NotoSansDevanagari-Bold.ttf']);
  assert.deepEqual(profileFiles(PROFILES.dejavu), profileFiles(PROFILES.scripts).slice(0, 6));
  assert.throws(() => profileOf('cjk'), e => e instanceof TestFontsError && e.code === 'profile');
});

test('the XML holds only the private folder, a private cache, DejaVu generics and the language fallback rules', () => {
  const xml = fontsConf({fontDir: '/f & <d>', cacheDir: '/c', profile: PROFILES.scripts});
  assert.match(xml, /^<\?xml version="1.0"\?>\n<!DOCTYPE fontconfig /);
  assert.deepEqual(xml.match(/<dir>[^<]*<\/dir>/g), ['<dir>/f &amp; &lt;d&gt;</dir>']);
  assert.match(xml, /<cachedir>\/c<\/cachedir>/);
  assert.doesNotMatch(xml, /<include|<dir prefix|xdg/);
  for (const [generic, family] of [['sans-serif', 'DejaVu Sans'], ['sans', 'DejaVu Sans'], ['system-ui', 'DejaVu Sans'],
    ['serif', 'DejaVu Serif'], ['monospace', 'DejaVu Sans Mono'], ['mono', 'DejaVu Sans Mono']])
    assert.ok(xml.includes(`<alias binding="strong"><family>${generic}</family><prefer><family>${family}</family></prefer></alias>`), generic);
  const rules = [...xml.matchAll(/<string>([^<]+)<\/string><\/test><edit name="family" mode="append_last" binding="strong"><string>([^<]+)<\/string>/g)].map(m => `${m[1]}→${m[2]}`);
  assert.deepEqual(rules, ['ja→Noto Sans CJK JP', 'zh-cn→Noto Sans CJK SC', 'zh-sg→Noto Sans CJK SC', 'zh-hans→Noto Sans CJK SC',
    'zh-tw→Noto Sans CJK TC', 'zh-hk→Noto Sans CJK TC', 'zh-mo→Noto Sans CJK TC', 'zh-hant→Noto Sans CJK TC', 'hi→Noto Sans Devanagari']);
  assert.doesNotMatch(fontsConf({fontDir: '/f', cacheDir: '/c', profile: PROFILES.dejavu}), /<match/);
});

test('each file comes from the first folder that has it; OPENVIREO_TEST_FONT_DIRS is searched before the system folders', () => {
  const have = new Set(['/a/DejaVuSans.ttf', '/b/DejaVuSans.ttf', '/b/DejaVuSans-Bold.ttf']);
  const {found, missing} = locateFonts(PROFILES.dejavu, ['/a', '/b'], p => have.has(p));
  assert.deepEqual([...found], [['DejaVuSans.ttf', '/a/DejaVuSans.ttf'], ['DejaVuSans-Bold.ttf', '/b/DejaVuSans-Bold.ttf']]);
  assert.deepEqual(missing.map(m => m.file), ['DejaVuSerif.ttf', 'DejaVuSerif-Bold.ttf', 'DejaVuSansMono.ttf', 'DejaVuSansMono-Bold.ttf']);
  assert.deepEqual(searchDirs({OPENVIREO_TEST_FONT_DIRS: '/x::/y'}), ['/x', '/y', ...SYSTEM_FONT_DIRS]);
  assert.deepEqual(searchDirs({}), [...SYSTEM_FONT_DIRS]);
});

test('a missing font fails with a typed message naming the files, the folders and the packages to install', () => fixture(async root => {
  const missing = locateFonts(PROFILES.scripts, [root]).missing;
  assert.equal(missingFontsMessage(missing.filter(m => /CJK|Devanagari/.test(m.file)), ['/u', '/v']), [
    'Test fonts missing: NotoSansCJK-Regular.ttc (Noto Sans CJK JP), NotoSansCJK-Bold.ttc (Noto Sans CJK JP), NotoSansDevanagari-Regular.ttf (Noto Sans Devanagari), NotoSansDevanagari-Bold.ttf (Noto Sans Devanagari).',
    'Searched: /u, /v.',
    'Install them with the system package manager, then run this again:',
    '  Debian/Ubuntu: sudo apt-get install -y fonts-noto-cjk fonts-noto-core',
    '  Arch: sudo pacman -S --needed noto-fonts-cjk noto-fonts',
    'Or add the folder that holds them to OPENVIREO_TEST_FONT_DIRS (colon-separated).',
  ].join('\n'));
  assert.match(missingFontsMessage(missing.filter(m => m.family.startsWith('DejaVu')), ['/u']),
    /\n  Debian\/Ubuntu: sudo apt-get install -y fonts-dejavu-core fonts-dejavu-mono\n  Arch: sudo pacman -S --needed ttf-dejavu\n/);
  await writeFile(path.join(root, 'DejaVuSans.ttf'), 'not a font');
  await assert.rejects(prepareTestFonts({profileName: 'scripts', env: {OPENVIREO_TEST_FONTS_DIR: path.join(root, 'out')}, dirs: [root]}),
    e => e instanceof TestFontsError && e.code === 'missing-font' && e.message.includes('DejaVuSans-Bold.ttf (DejaVu Sans)') && !e.message.includes('DejaVuSans.ttf ('));
}));

// On a machine (or the CI job) that has the fonts: the whole run, into a scratch output folder.
const ready = locateFonts(PROFILES.scripts, SYSTEM_FONT_DIRS).missing.length === 0;
test('with the fonts installed, it links them, writes the config and logs one hash line per file', {skip: !ready && 'test fonts not installed'}, () => fixture(async root => {
  const env = {OPENVIREO_TEST_FONTS_DIR: root};
  const report = await prepareTestFonts({profileName: 'scripts', env, dirs: SYSTEM_FONT_DIRS});
  assert.equal(report.fontconfigFile, path.join(root, 'scripts', 'fonts.conf'));
  assert.deepEqual(JSON.parse(await readFile(path.join(root, 'scripts', 'report.json'), 'utf8')), report);
  for (const f of report.files) {
    const link = path.join(root, 'scripts', 'fonts', f.name);
    assert.ok((await lstat(link)).isSymbolicLink());
    assert.equal(await readlink(link), f.path);
    assert.match(f.sha256, /^[0-9a-f]{64}$/);
  }
  assert.deepEqual(report.fallback.map(c => `${c.lang}:${c.first}>${c.scriptFace}`).slice(0, 2), ['ja:DejaVu Sans>Noto Sans CJK JP', 'zh-cn:DejaVu Sans>Noto Sans CJK SC']);
  const lines = reportLines(report);
  assert.equal(lines.length, 1 + report.files.length + report.fallback.length);
  // A second run over the same folder (another worktree, a Playwright worker) keeps the links and the result.
  assert.deepEqual((await prepareTestFonts({profileName: 'scripts', env, dirs: SYSTEM_FONT_DIRS})).files, report.files);
}));
