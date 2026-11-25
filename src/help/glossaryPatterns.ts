import type {TermId} from './glossary';

/** Front NEWCOMER NC7 [W] (plan analysis/front-plans/front-newcomer.md §2.7, review M4b): how the glossary snapshots
 * (src/i18n/terms.en.json, src/i18n/<dir>/terms.json) are made. Used only by src/help/glossary.test.ts, which regenerates every
 * snapshot and compares it with the committed one (`OPENVIREO_REFRESH_PINS=1 npx vitest run src/help/glossary.test.ts`, or
 * `npm run i18n:terms`, rewrites them; then review the git diff). Not imported by the app.
 *
 * Key-gating: a term is looked for in a language's string only when the English string of the same key matches the term's
 * English pattern; the language's own pattern (seeded from the stems of its lint glossary, src/i18n/<dir>/glossary.json) then
 * finds the words to mark. Quoted text («…», “…”, „…“, ‘…’, "…", 「…」, 『…』), the glossary's VIREO control names and the
 * control names of CONTROL_KEYS are never searched, so «Calculate B−V» stays a button's name. Terms are searched in the order of
 * TERM_IDS and a matched span is not searched again, so B−V inside E(B−V) is reddening, not the colour index. In alphabetic
 * scripts a match starts at a word start and runs to the end of its word (an inflected ending is kept: «красного смещения»); in
 * Chinese and Japanese it is exactly the pattern's text. The first match of each term in a string is recorded with how many
 * times the same text occurs before it, so the runtime marks the same occurrence. */

export type TermPatterns=Readonly<Record<TermId,string>>;
const DM='E\\(B[−-]V\\)',BV='(?<!E\\()B\\s?[−-]\\s?V',MM='m\\s?[−-]\\s?M';

/** The English patterns that gate every language (case-insensitive). */
export const ENGLISH_PATTERNS:TermPatterns={
 reddening:`\\breddening\\b|\\b${DM}`,
 colorIndex:`${BV}\\b|\\bcolou?r index(es)?\\b`,
 distanceModulus:`\\b(distance|apparent) modul(us|i)\\b|(?<![\\w(])${MM}\\b`,
 hrDiagram:'\\bH-?R diagrams?\\b|\\bHertzsprung[–-]Russell diagrams?\\b|\\bcolou?r[–-]magnitude diagrams?\\b',
 zams:'\\bZAMS\\b|\\bzero[- ]age main sequence\\b',
 mainSequence:'\\bmain sequence\\b',
 isochrone:'\\bisochrones?\\b',
 metallicity:'\\bmetallicit(y|ies)\\b',
 dispersionMeasure:'\\bdispersion measures?\\b|\\bDM\\b',
 pulsar:'\\bpulsars?\\b(?!\\.\\w)',
 caHK:'\\bCa II(?: K and H)?(?: lines?)?\\b|\\bG band\\b',
 absorptionLine:'\\babsorption (lines?|features?)\\b|\\bdark lines\\b',
 redshift:'\\bredshift(s|ed)?\\b',
 spectrum:'\\bspectr(um|a)\\b',
 photometer:'\\bphotometers?\\b',
 magnitude:'\\bmagnitudes?\\b',
};

/** Each language's patterns (case-insensitive; Unicode). The English snapshot uses ENGLISH_PATTERNS itself. */
export const LANGUAGE_PATTERNS:Readonly<Record<string,TermPatterns>>={
 es:{reddening:`enrojecimiento|${DM}`,colorIndex:`${BV}|índices? de color`,distanceModulus:`m[óo]dulos? (?:de distancia|aparentes?)|${MM}`,
  hrDiagram:'diagramas? (?:H-?R|de Hertzsprung|color[–-]magnitud)',zams:'secuencias? principal(?:es)? de edad cero|ZAMS',mainSequence:'secuencias? principal(?:es)?',
  isochrone:'isócronas?',metallicity:'metalicidad',dispersionMeasure:'medidas? de dispersión|DM',pulsar:'púlsar(?:es)?',
  caHK:'(?:líneas )?K y H de Ca II|Ca II(?: K y H)?|banda G',absorptionLine:'rasgos de absorción|líneas? de absorción|líneas oscuras',
  redshift:'corrimientos? al rojo',spectrum:'espectros?(?!\\p{L})',photometer:'fotómetros?',magnitude:'magnitud(?:es)?'},
 'pt-br':{reddening:`avermelhamento|${DM}`,colorIndex:`${BV}|[íi]ndices? de cor`,distanceModulus:`m[óo]dulos? (?:de dist[âa]ncia|aparentes?)|${MM}`,
  hrDiagram:'diagramas? (?:H-?R|de Hertzsprung|cor[–-]magnitude)',zams:'sequ[êe]ncias? principa(?:l|is) de idade zero|ZAMS',mainSequence:'sequ[êe]ncias? principa(?:l|is)',
  isochrone:'is[óo]cronas?',metallicity:'metalicidade',dispersionMeasure:'medidas? de dispers[ãa]o|DM',pulsar:'pulsar(?:es)?(?!s?\\.[A-Za-z])',
  caHK:'(?:linhas )?Ca II(?: K e H)?|banda G',absorptionLine:'feições de absorção|linhas? de absor[çc][ãa]o|linhas escuras',
  redshift:'desvios? para o vermelho',spectrum:'espectros?(?!\\p{L})',photometer:'fot[ôo]metros?',magnitude:'magnitudes?'},
 fr:{reddening:`rougissement|${DM}`,colorIndex:`${BV}|indices? de couleur`,distanceModulus:`modules? (?:de distance|apparents?)|${MM}`,
  hrDiagram:'diagrammes? (?:H-?R|de Hertzsprung|couleur[–-]magnitude)',zams:'s[ée]quence principale d[’\'][âa]ge z[ée]ro|ZAMS',mainSequence:'s[ée]quences? principales?',
  isochrone:'isochrones?',metallicity:'m[ée]tallicit[ée]',dispersionMeasure:'mesures? de dispersion|DM',pulsar:'pulsars?(?!\\.[A-Za-z])',
  caHK:'(?:raies )?Ca II(?: K et H)?|bande G',absorptionLine:'raies? d[’\']absorption|raies sombres',
  redshift:'d[ée]calages? vers le rouge',spectrum:'spectres?(?!\\p{L})',photometer:'photom[èe]tres?',magnitude:'magnitudes?'},
 id:{reddening:`pemerahan|${DM}`,colorIndex:`${BV}|indeks warna`,distanceModulus:`modulus (?:jarak|semu)|${MM}`,
  hrDiagram:'diagram (?:H-?R|Hertzsprung|warna[–-]magnitudo)',zams:'deret utama usia nol|ZAMS',mainSequence:'deret utama',
  isochrone:'isokron',metallicity:'metalisitas',dispersionMeasure:'ukuran dispersi|DM',pulsar:'pulsar(?!s?\\.[A-Za-z])',
  caHK:'(?:garis )?Ca II(?: K dan H)?|pita G',absorptionLine:'fitur serapan|garis(?:-garis)? serapan|garis-garis gelap|garis gelap',
  redshift:'pergeseran merah',spectrum:'spektrum',photometer:'fotometer',magnitude:'magnitudo'},
 hi:{reddening:`लालिमा|${DM}`,colorIndex:`${BV}|वर्ण सूचकांक`,distanceModulus:`(?:दूरी|आभासी) मापांक|${MM}`,
  hrDiagram:'H-?R आरेख|वर्ण[–-]कांतिमान आरेख',zams:'शून्य[- ]आयु मुख्य अनुक्रम|ZAMS',mainSequence:'मुख्य अनुक्रम',
  isochrone:'समकालिक वक्र|आइसोक्रोन',metallicity:'धात्विकता',dispersionMeasure:'परिक्षेपण माप|DM',pulsar:'पल्सर',
  caHK:'Ca II(?: K और H(?: रेखाएँ)?)?|G बैंड',absorptionLine:'अवशोषण लक्षण|अवशोषण रेखा|काली रेखा',
  redshift:'अभिरक्त विस्थापन(?: \\(रेडशिफ़्ट\\))?|रेडशिफ़्ट',spectrum:'स्पेक्ट्रम(?:ों)?(?![\\p{L}\\p{M}])',photometer:'फ़ोटोमीटर',magnitude:'कांतिमान'},
 ja:{reddening:`赤化|${DM}`,colorIndex:`${BV}|色指数`,distanceModulus:`距離指数|${MM}`,
  hrDiagram:'HR図|H-R図|色[–-]?等級図',zams:'ゼロ年齢主系列|ZAMS',mainSequence:'主系列',
  isochrone:'等時曲線',metallicity:'金属量',dispersionMeasure:'分散量度|DM',pulsar:'パルサー',
  caHK:'Ca II ?K線、H線|Ca II(?: ?KとH)?|G帯',absorptionLine:'吸収の特徴|吸収線|暗い線',
  redshift:'赤方偏移',spectrum:'スペクトル(?![線型分])',photometer:'測光器',magnitude:'等級'},
 'zh-hans':{reddening:`红化|${DM}`,colorIndex:`${BV}|色指数`,distanceModulus:`距离模数|视模数|${MM}`,
  hrDiagram:'赫罗图|HR图|颜色[–-]星等图',zams:'零龄主序|ZAMS',mainSequence:'主序',
  isochrone:'等龄线',metallicity:'金属丰度',dispersionMeasure:'色散量|DM',pulsar:'脉冲星',
  caHK:'电离钙K线和H线|电离钙|Ca II|G带',absorptionLine:'吸收特征|吸收线|暗线',
  redshift:'红移',spectrum:'光谱(?![仪型线类])',photometer:'光度计',magnitude:'星等'},
 'zh-hant':{reddening:`紅化|${DM}`,colorIndex:`${BV}|色指數`,distanceModulus:`距離模數|視模數|${MM}`,
  hrDiagram:'赫羅圖|HR圖|顏色[–-]星等圖',zams:'零齡主序|ZAMS',mainSequence:'主序',
  isochrone:'等齡線',metallicity:'金屬量|金屬度',dispersionMeasure:'色散量|DM',pulsar:'脈衝星',
  caHK:'電離鈣K線和H線|電離鈣|Ca II|G帶',absorptionLine:'吸收特徵|吸收線|暗線',
  redshift:'紅移',spectrum:'光譜(?![儀型線類])',photometer:'光度計',magnitude:'星等'},
 ru:{reddening:`покраснени|${DM}`,colorIndex:`${BV}|показател\\p{L}* цвета`,distanceModulus:`модул\\p{L}* расстояния|${MM}`,
  hrDiagram:'диаграмм\\p{L}* (?:Г\\s?[—–-]\\s?Р|Герцшпрунга|цвет\\s?[—–-]\\s?зв[её]здная величина)',zams:'начальн\\p{L}* главн\\p{L}* последовательност|НГП|ZAMS',mainSequence:'главн\\p{L}* последовательност',
  isochrone:'изохрон',metallicity:'металличност',dispersionMeasure:'мер\\p{L}* дисперсии|DM',pulsar:'пульсар',
  caHK:'(?:лини\\p{L}* )?Ca II(?: K и H)?|полос\\p{L}* G',absorptionLine:'лини\\p{L}* поглощения|т[её]мн\\p{L}* лини',
  redshift:'красн\\p{L}* смещени',spectrum:'спектр(?:а|ы|ов|е|ом|ам|ами|ах)?(?!\\p{L})',photometer:'фотометр(?!и)',magnitude:'зв[её]здн\\p{L}* величин'},
};

/** Catalog keys whose text is a control's name that a guide string may name without quotes (the photometer's buttons and
 * sections, the analyser's options): their text in each language is never searched. */
export const CONTROL_KEYS=['ph.calculateColor','pa.title','ph.activate','ph.filter','pleiadesPoint.open','photo.rendering','galaxyExposure.analyze'] as const;
/** VIREO control names a translation writes in running text that its lint glossary does not list (VIREO's Find Pulsar…). */
export const EXTRA_NAMES:Readonly<Record<string,readonly string[]>>={es:['Buscar púlsar…'],'pt-br':['Localizar pulsar…']};

/** Scripts written without spaces: a match is exactly the pattern's text. */
export const UNSPACED=new Set(['ja','zh-hans','zh-hant']);
const QUOTED=/«[^»]*»|“[^”]*”|„[^“”]*[“”]|‘[^’]*’|"[^"]*"|「[^」]*」|『[^』]*』/gu;
const WORD=/[\p{L}\p{M}]/u;
/** In a translation, VIREO's English name in parentheses or brackets after the translated one (the glossaries' rule): an ASCII
 * group with a letter, such as \u00AB(Find Pulsar)\u00BB or \u00AB[Set E(B-V)]\u00BB. */
const ORIGINAL=/\((?=[^)]*[A-Za-z])[\x20-\x7e]*?\)|\[(?=[^\]]*[A-Za-z])[\x20-\x7e]*?\]/gu;

/** `text` with every quoted span and every listed name (and, in a translation, every English original in parentheses or
 * brackets) replaced by a private-use character of the same length, so a pattern cannot match there and the offsets of the rest
 * are kept. */
export function masked(text:string,names:readonly string[],originals=false):string{
 const blank=(s:string)=>'\uE000'.repeat(s.length);
 let out=text.replace(QUOTED,blank);
 if(originals)out=out.replace(ORIGINAL,blank);
 for(const name of [...names].filter(Boolean).sort((a,b)=>b.length-a.length)){let at=out.indexOf(name);while(at>=0){out=out.slice(0,at)+blank(name)+out.slice(at+name.length);at=out.indexOf(name,at+name.length);}}
 return out;
}
const blankRange=(s:string,start:number,end:number)=>s.slice(0,start)+'\uE000'.repeat(end-start)+s.slice(end);

/** The terms of TERM_IDS order found in one string: [term, matched text, occurrences of that text before it]. */
export function matchTerms(order:readonly TermId[],english:string,englishNames:readonly string[],text:string,names:readonly string[],patterns:TermPatterns,unspaced:boolean):[TermId,string,number][]{
 let en=masked(english,englishNames),own=masked(text,names,text!==english);
 const out:[TermId,string,number][]=[];
 for(const id of order){
  const gate=new RegExp(ENGLISH_PATTERNS[id],'iu').exec(en);
  if(!gate)continue;
  en=blankRange(en,gate.index,gate.index+gate[0].length);
  const source=unspaced?patterns[id]:`(?<![\\p{L}\\p{M}\\p{N}])(?:${patterns[id]})`;
  const m=new RegExp(source,'iu').exec(own);
  if(!m||!m[0])continue;
  let end=m.index+m[0].length;
  if(!unspaced)while(end<own.length&&WORD.test(own[end]!))end++;
  const matched=text.slice(m.index,end);
  let before=0;for(let at=text.indexOf(matched);at>=0&&at<m.index;at=text.indexOf(matched,at+1))before++;
  out.push([id,matched,before]);
  own=blankRange(own,m.index,end);
 }
 return out;
}
