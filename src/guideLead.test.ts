import {readFileSync} from 'node:fs';
import path from 'node:path';
import {createElement,type ReactElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import en from './i18n/en.json';
import {LANGUAGES} from './i18n/languages';
import {LAB_SLUGS,type LabSlug} from './seo/labSlugs';
import {LAB_NEXT} from './home/labNext';
import {OBJECT_X_GUIDE_EN,OBJECT_X_LAB_EN} from './objectx/ObjectXMessages';
import HubbleLabGuide from './HubbleLabGuide';
import LssLabGuide from './LssLabGuide';
import ObjectXLabGuide from './ObjectXLabGuide';
import ClassificationLabGuide from './ClassificationLabGuide';
import ClusterLabGuide from './ClusterLabGuide';
import PulsarLabGuide from './PulsarLabGuide';
import PleiadesLabGuide from './PleiadesLabGuide';
import {hubbleLabProgress} from './core/hubbleLab';
import {EMPTY_HUBBLE} from './core/hubbleAnalysis';
import {INITIAL_LSS_LAB_SUMMARY,lssLabProgress} from './core/lssLab';
import {INITIAL_OBJECT_X_LAB_SUMMARY,objectXLabProgress} from './core/objectXLab';
import {EMPTY_CLASSIFICATION_EXERCISE_SUMMARY,classificationLabProgress} from './core/classificationLab';
import {EMPTY_CLASSIFICATION_WORKSPACE} from './core/classification';
import {clusterLabProgress,clusterOwnStatus} from './core/clusterLab';
import {EMPTY_PULSAR_MEASUREMENT_SUMMARY,INITIAL_RADIO_EXERCISE_SUMMARY,pulsarLabProgress} from './core/pulsarLab';
import {EMPTY_PLEIADES_EXERCISE_SUMMARY,pleiadesLabProgress} from './core/pleiadesLab';

// Front NEWCOMER NC4 (plan analysis/front-plans/front-newcomer.md §2.4, review M1; user decision of 2026-11-24): each guide's
// window opens with a why-line that asks the question the visitor will answer and never states the lab's result, not even
// qualitatively, and ends with What next once its counted steps are done.

type Catalog=Record<string,string>;
const DIRS=['en',...LANGUAGES.map(l=>l.dir)];
const catalog=(dir:string):Catalog=>JSON.parse(readFileSync(path.join(import.meta.dirname,'i18n',dir==='en'?'en.json':`${dir}/${dir}.json`),'utf8'));
/** Each language's Object X maps (the guide's why-line and the five kind names). */
const maps=(name:string)=>Object.fromEntries(Object.entries(import.meta.glob<Record<string,Record<string,unknown>>>('./i18n/*/maps/{objectXGuide,objectXLab}.ts',{eager:true}))
 .filter(([file])=>file.endsWith(`/${name}.ts`)).map(([file,module])=>[file.split('/')[2],Object.values(module)[0]]));
const GUIDE_MAPS:Record<string,Record<string,unknown>>={en:OBJECT_X_GUIDE_EN,...maps('objectXGuide')};
const LAB_MAPS:Record<string,Record<string,unknown>>={en:OBJECT_X_LAB_EN,...maps('objectXLab')};

/** Each lab's why-line key (Object X: the `why` of its guide map). */
const WHY:Readonly<Record<LabSlug,string|null>>={hubble:'lab.why','large-scale-structure':'lssLab.why','stellar-classification':'classLab.why',
 pleiades:'pleiadesLab.why','cluster-hr':'clusterLab.why',pulsars:'pulsarLab.why','object-x':null};
const why=(dir:string,lab:LabSlug)=>{const key=WHY[lab];return key?catalog(dir)[key]!:GUIDE_MAPS[dir]!.why as string;};

/** The result each guide's own texts let the visitor find, as words of each language: the Hubble guide's interpretation and
 * reflection questions (lab.interpretHelp, lab.reflect.*: an expansion, a proportional or linear relation and its slope); the LSS
 * guide's questions (lssLab.reflect.*: walls, voids, filaments, galaxies crowding or spread evenly); the pulsar guide's
 * dispersion measure and its causes (pulsarLab.data.*, the delay formula: a spinning neutron star, electrons and gas between the
 * stars); the classification guide's temperature sequence; the Pleiades and cluster guides' distance and age outcomes (light-years,
 * parsecs, a young or old cluster, its turnoff). An alphabetic entry matches at the start of a word (a prefix unless it ends with
 * `$`, a whole word), or anywhere inside a word when it starts with `*` (so «unevenly», «неравномерно», «inégalement» and «असमान»
 * are caught with their positive forms); a CJK entry anywhere. NC4 review (N3) added the growth and clumping stems. Object X: the five kind names of the language (OBJECT_X_LAB.kinds). */
const RESULT:Readonly<Record<Exclude<LabSlug,'object-x'|'cluster-hr'>,Readonly<Record<string,readonly string[]>>>>={
 hubble:{
  en:['expan','faster','proportion','linear','slope','increas','grow','farther','more quickly'],
  es:['expan','más rápid','más deprisa','proporcion','lineal','pendiente','aument','crec','más lej'],
  'pt-br':['expan','mais rápid','mais depressa','proporcion','linear','inclinação','aument','cresc','mais long'],
  fr:['expansion','plus vite','plus rapide','proportionn','linéaire','pente','augment','croît','croiss','plus loin','plus lointain'],
  id:['mengembang','ekspansi','lebih cepat','sebanding','proporsional','linear','linier','kemiringan','bertambah','meningkat','makin','semakin','lebih jauh'],
  hi:['फैल','प्रसार','अधिक तेज़','आनुपातिक','रैखिक','ढलान','बढ़','अधिक दूर','ज़्यादा दूर'],ja:['膨張','速く','比例','直線','傾き','増','ほど速','ほど遠'],
  'zh-hans':['膨胀','更快','正比','线性','斜率','增','越远','越快'],'zh-hant':['膨脹','更快','正比','線性','斜率','增','越遠','越快'],
  ru:['расшир','быстрее','пропорциональн','линейн','наклон','увелич','раст$','растёт','растут','возраста','дальше'],
 },
 'large-scale-structure':{
  en:['wall','void','filament','crowd','*evenly','cosmic web','bubble','clump','cluster','sheet','empty','*uneven'],
  es:['muralla','pared','vacío','vacía','filament','agrup','*uniforme','red cósmica','burbuja','grumo','cúmul','lámina','desigual'],
  'pt-br':['muralha','parede','vazio','vazia','filament','aglomer','*uniforme','teia cósmica','bolha','grumo','lâmina','desigual'],
  fr:['mur$','murs$','vide','filament','amas','*uniformément','*inégal','toile cosmique','bulle','grumeau','feuillet','regroup'],
  id:['dinding','kosong','filamen','berkerumun','*merata','jaring kosmik','gelembung','gumpal','gugus','lembaran','mengelompok'],
  hi:['दीवार','रिक्त','तंतु','झुंड','*समान रूप','*असमान','ब्रह्मांडीय जाल','गुच्छ','परत','खाली'],
  ja:['壁','空洞','ボイド','フィラメント','密集','一様','網の目','泡','塊','集団','群れ','シート','空っぽ','偏り','偏って'],
  'zh-hans':['墙','空洞','巨洞','纤维','聚集','均匀','宇宙网','泡','团块','成团','星系团','片状','空的'],
  'zh-hant':['牆','空洞','巨洞','纖維','聚集','均勻','宇宙網','泡','團塊','成團','星系團','片狀','空的'],
  ru:['стен','пуст','войд','волокн','нит$','нити$','*равномерн','паутин','пузыр','сгущ','скоплен','слои','слой','комк'],
 },
 'stellar-classification':{
  en:['temperature','hotter','cooler','hot$','cool$'],es:['temperatura','caliente','fría','frío'],'pt-br':['temperatura','quente','fria','frio'],
  fr:['température','chaud','froid'],id:['suhu','temperatur','panas','dingin'],hi:['तापमान','गर्म','ठंड','शीतल'],
  ja:['温度','高温','低温','熱い','冷たい'],'zh-hans':['温度','高温','低温','更热','更冷'],'zh-hant':['溫度','高溫','低溫','更熱','更冷'],ru:['температур','горяч','холодн'],
 },
 pleiades:{
  en:['light-year','light year','parsec','young','old$','older','turnoff','turn-off','million','billion'],es:['año luz','años luz','pársec','joven','jóven','viej','millon'],
  'pt-br':['ano-luz','anos-luz','parsec','jovem','velh','milh'],fr:['année-lumière','années-lumière','parsec','jeune','vieux','vieil','million','milliard'],
  id:['tahun cahaya','parsek','muda$','tua$','juta$','miliar'],hi:['प्रकाश-वर्ष','प्रकाशवर्ष','पारसेक','युवा','पुरान','बूढ़','लाख','करोड़','अरब'],
  ja:['光年','パーセク','若い','古い','ターンオフ','億'],'zh-hans':['光年','秒差距','年轻','年老','古老','拐点','亿'],'zh-hant':['光年','秒差距','年輕','年老','古老','轉折點','億'],
  ru:['светов','парсек','молод','стар','точк[аи] поворота','миллион','миллиард'],
 },
 pulsars:{
  en:['neutron','electron','gas$','gases','spin','rotat','dispersion','plasma','interstellar'],es:['neutr','electr','gas$','gases','gira','rotación','dispersi','plasma','interestelar'],
  'pt-br':['nêutron','neutr','elétr','gás','gira','rotação','dispers','plasma','interestelar'],fr:['neutron','électron','gaz','rotation','tourn','dispersion','plasma','interstellaire'],
  id:['neutron','elektron','gas$','berputar','rotasi','dispersi','plasma','antarbintang'],hi:['न्यूट्रॉन','इलेक्ट्रॉन','गैस','घूर्णन','घूम','परिक्षेपण','प्लाज़्मा','अंतरतारकीय'],
  ja:['中性子','電子','ガス','自転','回転','分散','プラズマ','星間'],'zh-hans':['中子','电子','气体','自转','旋转','色散','等离子','星际'],
  'zh-hant':['中子','電子','氣體','自轉','旋轉','色散','電漿','星際'],ru:['нейтрон','электрон','газ','враща','дисперси','плазм','межзвёздн'],
 },
};
const CJK=new Set(['ja','zh-hans','zh-hant']);
const stems=(dir:string,lab:LabSlug):readonly string[]=>{
 if(lab==='object-x'){const kinds=Object.values(LAB_MAPS[dir]!.kinds as Record<string,string>).map(k=>k.replace(/\s*[(（].*$/u,''));return [...kinds,'QSO'];}
 return RESULT[lab==='cluster-hr'?'pleiades':lab][dir]!;
};
const matcher=(dir:string,stem:string)=>{
 const inside=stem.startsWith('*'),whole=stem.endsWith('$'),body=stem.slice(inside?1:0,whole?-1:undefined);
 return CJK.has(dir)?new RegExp(body,'u'):new RegExp(`${inside?'':'(?<![\\p{L}\\p{M}])'}${body}${whole?'(?![\\p{L}\\p{M}])':''}`,'iu');
};
const statesResult=(dir:string,lab:LabSlug,text:string)=>stems(dir,lab).filter(stem=>matcher(dir,stem).test(text));

describe('Front NEWCOMER NC4: the why-lines ask, and never answer',()=>{
 it('ten languages, seven labs, every result list complete',()=>{
  expect(DIRS).toHaveLength(10);
  for(const lists of Object.values(RESULT))expect(Object.keys(lists).sort()).toEqual([...DIRS].sort());
 });
 for(const dir of DIRS)it(`${dir}: each why-line is a question, with no digit and none of its guide's results`,()=>{
  for(const lab of LAB_SLUGS){
   const text=why(dir,lab);
   expect(text,`${dir} ${lab}`).toBeTruthy();
   expect(text,`${dir} ${lab}`).toMatch(/[?？]/u);
   expect(text,`${dir} ${lab}: a digit`).not.toMatch(/\p{Nd}/u);
   expect(statesResult(dir,lab,text),`${dir} ${lab}: ${text}`).toEqual([]);
   if(dir!=='en')expect(text,`${dir} ${lab}: untranslated`).not.toBe(why('en',lab));
  }
 });
 it('each why-line is at most 60 English words (plan §7: the lead paragraph)',()=>{
  for(const lab of LAB_SLUGS)expect(why('en',lab).split(/\s+/).length,lab).toBeLessThanOrEqual(60);
 });
 for(const dir of DIRS)it(`${dir}: the Hubble and LSS home cards say what the visitor does, not what they find`,()=>{
  const c=catalog(dir);
  expect(statesResult(dir,'hubble',c['home.hubbleSummary']!),c['home.hubbleSummary']).toEqual([]);
  expect(statesResult(dir,'large-scale-structure',c['home.lssSummary']!),c['home.lssSummary']).toEqual([]);
 });
 it('the check bites: the former home summaries and textbook answers are caught',()=>{
  expect(statesResult('en','hubble','Measure how fast galaxies are moving away and how far they are, then work out how fast the universe expands.')).toEqual(['expan']);
  expect(statesResult('en','large-scale-structure','Measure the redshifts of many galaxies and map the cosmic web.')).toEqual(['cosmic web']);
  expect(statesResult('en','cluster-hr','How old is this young cluster?')).toEqual(['young','old$']);
  expect(statesResult('es','hubble','Mide y calcula a qué ritmo se expande el universo.')).toEqual(['expan']);
  expect(statesResult('ja','pulsars','パルサーは中性子星です。')).toEqual(['中性子']);
  expect(statesResult('ru','stellar-classification','Чем горячее звезда?')).toEqual(['горяч']);
  expect(statesResult('fr','object-x','Est-ce un astéroïde ?')).toEqual(['astéroïde']);
  expect(statesResult('en','pleiades','Is it bold?')).toEqual([]);
  // NC4 review (N3): growth, clumping and negated forms.
  expect(statesResult('en','hubble','Farther galaxies recede more quickly: speed increases with distance.')).toEqual(['increas','farther','more quickly']);
  expect(statesResult('en','large-scale-structure','Galaxies are spread unevenly, in clumps and sheets around empty regions.')).toEqual(['*evenly','clump','sheet','empty','*uneven']);
  expect(statesResult('ru','large-scale-structure','Галактики распределены неравномерно.')).toEqual(['*равномерн']);
  expect(statesResult('fr','large-scale-structure','Les galaxies sont réparties inégalement.')).toEqual(['*inégal']);
  expect(statesResult('hi','large-scale-structure','आकाशगंगाएँ असमान रूप से फैली हैं।')).toContain('*असमान');
  expect(statesResult('es','hubble','La velocidad aumenta con la distancia.')).toEqual(['aument']);
  expect(statesResult('zh-hans','hubble','速度随距离增大。')).toEqual(['增']);
  expect(statesResult('ja','hubble','速度は距離とともに増えます。')).toEqual(['増']);
 });
});

describe('Front NEWCOMER NC4: What next',()=>{
 // NC4 review (N6): Stellar classification, the Start-here lab (plan Q6), is where a visitor begins, so no lab suggests it.
 it('every lab suggests another lab; every lab but Stellar classification, the Start-here lab, is suggested',()=>{
  expect(Object.keys(LAB_NEXT).sort()).toEqual([...LAB_SLUGS].sort());
  for(const lab of LAB_SLUGS){expect(LAB_SLUGS).toContain(LAB_NEXT[lab]);expect(LAB_NEXT[lab],lab).not.toBe(lab);}
  expect(new Set(Object.values(LAB_NEXT))).toEqual(new Set(LAB_SLUGS.filter(lab=>lab!=='stellar-classification')));
  expect(LAB_NEXT.pleiades).toBe('cluster-hr');
 });
 for(const dir of DIRS)it(`${dir}: the three What next strings exist and keep {lab}`,()=>{
  const c=catalog(dir);
  for(const key of ['lab.whatNext','lab.tryNext','lab.openNext'])expect(c[key],`${dir} ${key}`).toBeTruthy();
  expect(c['lab.tryNext']).toContain('{lab}');
 });
});

const E=en as Catalog;
const ref={current:null};
const noop=()=>{};
const html=(el:ReactElement)=>renderToStaticMarkup(el);
/** Each window at its first step and in its closing state. */
const WINDOWS:readonly (readonly [LabSlug,string,(closing:boolean)=>string])[]=[
 ['hubble','hubble-lab',c=>html(createElement(HubbleLabGuide,{dialogRef:ref,progress:{...hubbleLabProgress([],[],EMPTY_HUBBLE),...c?{next:'interpret' as const}:{}},onNavigate:noop,onNext:noop,onVersion:noop}))],
 ['large-scale-structure','lss-lab',c=>html(createElement(LssLabGuide,{dialogRef:ref,progress:{...lssLabProgress(INITIAL_LSS_LAB_SUMMARY),...c?{next:'done' as const}:{}},onNavigate:noop,onNext:noop}))],
 ['object-x','objectx-lab',c=>html(createElement(ObjectXLabGuide,{dialogRef:ref,progress:{...objectXLabProgress(INITIAL_OBJECT_X_LAB_SUMMARY),...c?{next:'done' as const}:{}},onNavigate:noop,onNext:noop}))],
 ['stellar-classification','classification-lab',c=>html(createElement(ClassificationLabGuide,{dialogRef:ref,progress:{...classificationLabProgress(EMPTY_CLASSIFICATION_WORKSPACE,EMPTY_CLASSIFICATION_EXERCISE_SUMMARY),...c?{next:'save' as const}:{}},onNavigate:noop,onNext:noop}))],
 ['cluster-hr','cluster-lab',c=>html(createElement(ClusterLabGuide,{dialogRef:ref,progress:clusterLabProgress({loaded:true,inspected:c,validTrial:c,confirmed:c,reportOpened:c}),cluster:null,onNavigate:noop,own:clusterOwnStatus(0,10,false),onNext:noop}))],
 ['pulsars','pulsar-lab',c=>html(createElement(PulsarLabGuide,{dialogRef:ref,progress:{...pulsarLabProgress({radio:INITIAL_RADIO_EXERCISE_SUMMARY,analysis:EMPTY_PULSAR_MEASUREMENT_SUMMARY,captureRows:0}),...c?{next:'save' as const}:{}},onNavigate:noop,onNext:noop}))],
 ['pleiades','pleiades-lab',c=>html(createElement(PleiadesLabGuide,{dialogRef:ref,progress:{...pleiadesLabProgress({list:true,pointed:false,photometer:EMPTY_PLEIADES_EXERCISE_SUMMARY}),...c?{next:'save' as const}:{}},onNavigate:noop,onNext:noop,onVersion:noop}))],
];
const NAME:Readonly<Record<LabSlug,string>>={hubble:E['home.hubble']!,'large-scale-structure':E['home.lss']!,'stellar-classification':E['home.classification']!,
 pleiades:E['home.pleiades']!,'cluster-hr':E['home.clusterHr']!,pulsars:E['home.pulsars']!,'object-x':E['home.objectX']!};
const esc=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');

describe('Front NEWCOMER NC4: the seven windows',()=>{
 for(const [lab,prefix,render] of WINDOWS)it(`${lab}: the why-line describes the dialog, the former intro is a research note, What next only once done`,()=>{
  const open=render(false),done=render(true);
  expect(open).toContain(`aria-describedby="${prefix}-why"`);
  // The why-line comes first after the heading, before the research notes and the progress block.
  // Front NEWCOMER NC5: the Hubble and Pleiades windows put their version choice between the two.
  const lead=new RegExp(`<p id="${prefix}-why" class="lab-why">([^<]+)</p>(?:<div class="lab-version">(?:(?!<details).)*)?<details class="research-notes"><summary>${E['notes.summary']}</summary><p>([^<]+)</p>`).exec(open);
  expect(lead,lab).not.toBeNull();
  expect(lead![1]).toBe(esc(why('en',lab)));
  expect(open.indexOf(`id="${prefix}-why"`)).toBeLessThan(open.indexOf('class="lab-progress"'));
  expect(open).not.toContain('lab-what-next');
  const next=LAB_NEXT[lab];
  expect(done).toContain(`<section class="lab-what-next" aria-labelledby="${prefix}-what-next" data-next-lab="${next}"><h3 id="${prefix}-what-next">${E['lab.whatNext']}</h3>`);
  expect(done).toContain(`<p>${esc(E['lab.tryNext']!.replace('{lab}',NAME[next]))}</p><button type="button" class="secondary-button">${E['lab.openNext']}</button></section>`);
 });
 it('the cluster window shows no What next without a way to open the next guide',()=>{
  expect(html(createElement(ClusterLabGuide,{dialogRef:ref,progress:clusterLabProgress({loaded:true,inspected:true,validTrial:true,confirmed:true,reportOpened:true}),cluster:null,onNavigate:noop,own:clusterOwnStatus(0,10,false)}))).not.toContain('lab-what-next');
 });
});

// Front NEWCOMER NC5 (plan §2.5; user decision of 2026-11-24): the quick versions of Hubble's law and Pleiades photometry.
const VERSION_KEYS=['lab.version.legend','lab.version.quick','lab.version.full','lab.version.note','lab.version.tip','lab.version.quickDone','lab.version.continueFull','lab.version.strip','pleiadesLab.version.quick','pleiadesLab.version.full'];
describe('Front NEWCOMER NC5: the version choice',()=>{
 for(const dir of DIRS)it(`${dir}: the ten version strings exist, keep {count}, and state none of their lab's results`,()=>{
  const c=catalog(dir);
  for(const key of VERSION_KEYS){expect(c[key],`${dir} ${key}`).toBeTruthy();if(dir!=='en'&&key!=='lab.version.legend')expect(c[key],`${dir} ${key}: untranslated`).not.toBe(E[key]);}
  for(const key of ['lab.version.quick','lab.version.full','pleiadesLab.version.quick','pleiadesLab.version.full'])expect(c[key],`${dir} ${key}`).toContain('{count}');
  for(const key of VERSION_KEYS.filter(k=>k.startsWith('lab.')))expect(statesResult(dir,'hubble',c[key]!),`${dir} ${key}: ${c[key]}`).toEqual([]);
  for(const key of ['lab.version.note','lab.version.quickDone','lab.version.continueFull','lab.version.strip','pleiadesLab.version.quick','pleiadesLab.version.full'])expect(statesResult(dir,'pleiades',c[key]!),`${dir} ${key}: ${c[key]}`).toEqual([]);
  // The goal-neutral counts name the goal beside the real count, never as «count of goal».
  expect(c['lab.counts']).toMatch(/\{rows\}.*\{total\}/u);
  expect(c['lab.next.interpretSupported']).toContain('{count}');
  expect(c['pleiadesLab.step.sample.help']).toContain('{total}');
 });
 const hubble=(goal:number,closing:boolean)=>html(createElement(HubbleLabGuide,{dialogRef:ref,progress:{...hubbleLabProgress([],[],EMPTY_HUBBLE,goal),...closing?{next:'interpret' as const}:{}},onNavigate:noop,onNext:noop,onVersion:noop}));
 const pleiades=(goal:number,closing:boolean)=>html(createElement(PleiadesLabGuide,{dialogRef:ref,progress:{...pleiadesLabProgress({list:true,pointed:false,photometer:EMPTY_PLEIADES_EXERCISE_SUMMARY,goal}),...closing?{next:'save' as const}:{}},onNavigate:noop,onNext:noop,onVersion:noop}));
 it('Hubble: a radio group under the why-line, the shared note and the tip; the goal in the counts; Continue with the full exercise once the quick version is done',()=>{
  const quick=hubble(3,false),full=hubble(13,false);
  expect(quick).toContain(`<legend>${E['lab.version.legend']}</legend>`);
  expect(quick).toMatch(/<input type="radio" id="hubble-lab-version-quick" name="hubble-lab-version" checked="" value="quick"\/>Quick: 3 galaxies<\/label>/u);
  expect(quick).toContain('value="full"/>Full: all 13 galaxies, as in the original</label>');
  expect(full).toMatch(/checked="" value="full"\/>Full: all 13 galaxies/u);
  expect(quick).toContain(`<p id="hubble-lab-version-note" class="lab-version-note">${esc(E['lab.version.note']!)}</p><p class="lab-version-note">${E['lab.version.tip']}</p>`);
  expect(quick).toContain('Complete Hubble targets: 0 (goal 3)');
  expect(full).toContain('Complete Hubble targets: 0 (goal 13)');
  expect(quick.indexOf('class="lab-why"')).toBeLessThan(quick.indexOf('class="lab-version"'));
  expect(quick).not.toContain(E['lab.version.continueFull']);
  const done=hubble(3,true);
  expect(done).toContain(`<div class="lab-version-done"><p>${E['lab.version.quickDone']}</p><button type="button" class="secondary-button">${E['lab.version.continueFull']}</button></div>`);
  expect(done).toContain('Your dataset of 0 galaxies');
  expect(hubble(13,true)).not.toContain('lab-version-done');
 });
 it('Pleiades: the stars, the goal in its coverage and sample status; the sample help names the full version’s 24 stars',()=>{
  const quick=pleiades(8,false);
  expect(quick).toMatch(/checked="" value="quick"\/>Quick: 8 stars<\/label>/u);
  expect(quick).toContain('Full: all 24 stars, as in the original');
  expect(quick).not.toContain(E['lab.version.tip']);
  expect(quick).toContain('Admitted stars with your own confirmed B−V: 0 (goal 8)');
  expect(quick).toContain('Admitted stars with your confirmed B−V: 0 (goal 8)');
  expect(quick).toContain('the full version covers all 24 admitted original stars');
  expect(pleiades(8,true)).toContain('lab-version-done');
  expect(pleiades(24,true)).not.toContain('lab-version-done');
 });
});
