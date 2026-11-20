import {describe,expect,it} from 'vitest';
import {cjkPunctuation,fixCjkPunctuation as fix,JAPANESE_STYLE,SIMPLIFIED_CHINESE_STYLE,TRADITIONAL_CHINESE_STYLE} from './cjkPunctuation';
import {fixSourceLiterals} from './frenchSpacing';
// Front JA0 (plan front-i18n-ja.md §1.2 #1, §4.2): the CJK punctuation fixer is pure and idempotent, rewrites only what its header
// names and keeps every exception; through fixSourceLiterals it touches string literals only and writes characters, never escapes.
describe('Front JA0: the CJK punctuation fixer (Japanese)',()=>{
 const CASES:readonly (readonly [string,string])[]=[
  ['保存しました.','保存しました。'],['保存しました. 次に開きます.','保存しました。次に開きます。'],['銀河,星団,パルサー','銀河、星団、パルサー'],
  ['赤経: 12h','赤経：12h'],['本当ですか?','本当ですか？'],['開きます!','開きます！'],['本当?!','本当？！'],['注意; 再読み込み','注意；再読み込み'],
  ['望遠鏡(1.0 m)','望遠鏡（1.0 m）'],['デモンストレーションモード (Demonstration Mode)','デモンストレーションモード（Demonstration Mode）'],
  ['(Save As...)を選びます','（Save As...）を選びます'],['「開く」.','「開く」。'],['（例）.','（例）。'],
  ['"開く"を選びます。','「開く」を選びます。'],['“開く”を選びます。','「開く」を選びます。'],['「名前は"A"です」','「名前は『A』です」'],
  ['{count} 件の結果','{count}件の結果'],['OpenVireo の調査','OpenVireoの調査'],['30 秒','30秒'],['Enter キー','Enterキー'],['CCD カメラ','CCDカメラ'],
  ['保存 。','保存。'],['テスト , 次','テスト、次'],['テスト .','テスト。'],['テスト (abc) .','テスト（abc）。'],['「テスト」 .','「テスト」。'],
  ['「a“b”c」','「a『b』c」'],['https://example.comを開き, 次に','https://example.comを開き、次に'],['https://openvireo.space/?lang=ja を開く','https://openvireo.space/?lang=jaを開く'],
  ['?lang=jaを開く, 次','?lang=jaを開く、次'],['色指数(B-V)を測ります','色指数（B-V）を測ります'],['E(赤化)を設定','E（赤化）を設定'],['NOMAD (Zacharias)の','NOMAD（Zacharias）の'],['天体ID(Show Object ID)を表示','天体ID（Show Object ID）を表示'],['QSO(Quasar)は','QSO（Quasar）は'],['「 開く 」','「開く」'],['（ 例 ）','（例）'],['保存、 次へ','保存、次へ'],['1)最初','1）最初'],
 ];
 it.each(CASES)('fixes %j',(input,expected)=>{expect(fix(input)).toBe(expected);expect(fix(expected)).toBe(expected);expect(fix(fix(input))).toBe(fix(input));});
 const KEPT=['名前を付けて保存...','保存…','スペクトル.SSP','?lang=ja','12:30:45','1.5','12 km/s','500 Å','(RA:)','Save As...','RA: 12h',
  'ファイル › 保存','0.4 m望遠鏡','3500–7300 K','{a}、{b}','行1\n行2','Enter','(Observer\'s Notebook)','12%','保存。','ファイル.{ext}','テスト ?キー','「開く」を選びます。',' 前後の空白 ','E(B-V)を設定','E(B-V)の値','E(B−V)を設定','「見かけの等級（V）」（App. Mag (V)）','（App. Mag (V)）を','「仮想天文台（全観測装置）」（Virtual Observatory (All Instruments)）','StrToInt(x)で変換'];
 it.each(KEPT)('keeps %j',text=>{expect(fix(text)).toBe(text);});
 it('leaves an odd number of straight quotes and a fragment\'s quotes alone',()=>{
  expect(fix('名前"開く')).toBe('名前"開く');expect(fix('"開く"',JAPANESE_STYLE,{quotes:false})).toBe('"開く"');
 });
 it('treats a template value as a placeholder',()=>{
  expect(fix('\ue000 件',JAPANESE_STYLE,{valueMarks:/\ue000/u})).toBe('\ue000件');expect(fix('\ue000 件')).toBe('\ue000 件');
 });
 it('reports each change with a label',()=>{
  expect(cjkPunctuation('保存しました. "開く"').changes.map(c=>c.label)).toEqual(['「 」 instead of straight quotes','「 」 instead of straight quotes','full-width 。 after CJK text','no space next to CJK text']);
  expect(cjkPunctuation('保存しました。').changes).toEqual([]);
 });
});
describe('Front JA0: the CJK punctuation fixer is written for Chinese too',()=>{
 it('uses the style\'s comma and quotes',()=>{
  expect(fix('银河,星团. "打开"',SIMPLIFIED_CHINESE_STYLE)).toBe('银河，星团。“打开”');
  expect(fix('銀河,星團. "打開"',TRADITIONAL_CHINESE_STYLE)).toBe('銀河，星團。「打開」');
  expect(fix('选择“打开”。',SIMPLIFIED_CHINESE_STYLE)).toBe('选择“打开”。');
  expect(fix('選擇“打開”。',TRADITIONAL_CHINESE_STYLE)).toBe('選擇「打開」。');
  expect(fix('望远镜 (1.0 m)',SIMPLIFIED_CHINESE_STYLE)).toBe('望远镜（1.0 m）');
 });
});
describe('Front JA0: rewriting the string literals of a Japanese map source',()=>{
 const f=(s:string)=>fixSourceLiterals(s,(t,o)=>fix(t,JAPANESE_STYLE,o));
 it('fixes literals, keeps keys, comments and paths, and writes characters',()=>{
  const src="import type {X} from '../../maps';// 保存. コメント\nconst T=Object.freeze({'KEY.LST':'保存しました.',b:\"開く (Open)\",c:(n:number)=>`${n} 件の結果`});";
  const once=f(src);
  expect(once).toBe("import type {X} from '../../maps';// 保存. コメント\nconst T=Object.freeze({'KEY.LST':'保存しました。',b:\"開く（Open）\",c:(n:number)=>`${n}件の結果`});");
  expect(f(once)).toBe(once);expect(once).not.toMatch(/\\u/);
 });
 it('decodes escapes a batch may have typed',()=>{
  expect(f("a:'保存\\u00a0OpenVireo'")).toBe("a:'保存OpenVireo'");
 });
});
