import {readFileSync} from 'node:fs';
import path from 'node:path';
import {createElement,type ReactElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import en from './i18n/en.json';
import {LANGUAGES,languageEntry} from './i18n/languages';
import {SEO_LANGUAGES} from './seo/languages';
import {LAB_SLUGS,type LabSlug} from './seo/labSlugs';
import {LAB_NEXT} from './home/labNext';
import {LAB_FACTS} from './home/labFacts';
import {OBJECT_X_GUIDE_EN,OBJECT_X_LAB_EN} from './objectx/ObjectXMessages';
import TERMS_EN from './i18n/terms.en.json';
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
  hi:['फैल','प्रसार','विस्तार(?![ \u00a0]+से)$','अधिक तेज़','आनुपातिक','रैखिक','ढलान','बढ़','अधिक दूर','ज़्यादा दूर'],ja:['膨張','速く','比例','直線','傾き','増','ほど速','ほど遠'],
  'zh-hans':['膨胀','更快','正比','线性','斜率','增','越远','越快'],'zh-hant':['膨脹','更快','正比','線性','斜率','增','越遠','越快'],
  ru:['расшир','быстрее','пропорциональн','линейн','наклон','увелич','раст$','растёт','растут','возраста','дальше'],
 },
 'large-scale-structure':{
  en:['wall','void','filament','crowd','*evenly','cosmic web','bubble','clump','cluster','sheet','empty','*uneven','structur'],
  es:['muralla','pared','vacío','vacía','filament','agrup','*uniforme','red cósmica','burbuja','grumo','cúmul','lámina','desigual','estructur'],
  'pt-br':['muralha','parede','vazio','vazia','filament','aglomer','*uniforme','teia cósmica','bolha','grumo','lâmina','desigual','estrutur'],
  fr:['mur$','murs$','vide','filament','amas','*uniformément','*inégal','toile cosmique','bulle','grumeau','feuillet','regroup','structur'],
  id:['dinding','kosong','filamen','berkerumun','*merata','jaring kosmik','gelembung','gumpal','gugus','lembaran','mengelompok','struktur'],
  hi:['दीवार','रिक्त','तंतु','झुंड','*समान रूप','*असमान','ब्रह्मांडीय जाल','गुच्छ','परत','खाली','संरचना'],
  ja:['壁','空洞','ボイド','フィラメント','密集','一様','網の目','泡','塊','集団','群れ','シート','空っぽ','偏り','偏って','構造'],
  'zh-hans':['墙','空洞','巨洞','纤维','聚集','均匀','宇宙网','泡','团块','成团','星系团','片状','空的','结构'],
  'zh-hant':['牆','空洞','巨洞','纖維','聚集','均勻','宇宙網','泡','團塊','成團','星系團','片狀','空的','結構'],
  ru:['стен','пуст','войд','волокн','нит$','нити$','*равномерн','паутин','пузыр','сгущ','скоплен','слои','слой','комк','структур'],
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

// Front NEWCOMER /labs/ texts (user decision of 2026-11-25, AGENTS.md): the search pages under /labs/ (src/seo/labs*.ts) stop
// stating a lab's result as well. Every text of each lab page (title, description, heading, intro, steps and learn list) goes
// through the same per-language result lists, clause by clause, and only these reviewed exceptions pass:
// - KEPT_QUESTIONS: a search keyword the page keeps on purpose (Hubble's expansion, the cosmic web, the dispersion measure) passes
//   only in one of the exact question clauses listed for its language, the ones now on the pages («Are galaxies scattered at random,
//   or do they form a cosmic web?»). A new question with a kept keyword («How fast is the universe expanding?») fails until it is
//   reviewed and listed; stated as a fact it always fails, and any other result word fails even in a listed question. Each page must
//   still carry its kept keyword somewhere, so search finds it.
// - Object X: a clause that names all five kinds is the lab's own question when it is itself a question, or when it is the
//   description's or the intro's indirect question («…you decide whether the object is a star, a galaxy, a quasar, a pulsar or an
//   asteroid»); naming fewer gives one away, and so does the Solar System, which the guide hides until the reveal.
// - The lab's own name: «Large-scale structure» names the lab in its title, heading and (zh-Hans, zh-Hant) description, so the
//   name in the page's language (its `name`) is taken out of a clause before the check; «structure» anywhere else fails.
// - ALLOWED: two strings carry a result word legitimately and are allowed only that word: the pulsar step that compares with the
//   catalogue's dispersion measure, and the Object X step that starts «For an asteroid…» (a conditional the original manual gives).
const KEPT:Readonly<Record<'hubble'|'large-scale-structure'|'pulsars',Readonly<Record<string,readonly string[]>>>>={
 hubble:{en:['expan'],es:['expan'],'pt-br':['expan'],fr:['expansion'],id:['mengembang','ekspansi'],hi:['फैल','प्रसार'],ja:['膨張'],
  'zh-hans':['膨胀'],'zh-hant':['膨脹'],ru:['расшир']},
 'large-scale-structure':{en:['cosmic web'],es:['red cósmica'],'pt-br':['teia cósmica'],fr:['toile cosmique'],id:['jaring kosmik'],
  hi:['ब्रह्मांडीय जाल'],ja:['網の目'],'zh-hans':['宇宙网'],'zh-hant':['宇宙網'],ru:['паутин']},
 pulsars:{en:['dispersion'],es:['dispersi'],'pt-br':['dispers'],fr:['dispersion'],id:['dispersi'],hi:['परिक्षेपण'],ja:['分散'],
  'zh-hans':['色散'],'zh-hant':['色散'],ru:['дисперси']},
};
/** The reviewed question clauses that may carry a kept keyword, exactly as on the pages (review N2). */
const KEPT_QUESTIONS:Readonly<Record<string,readonly string[]>>={
 en:['Is the universe standing still, or expanding?','random, or a cosmic web?','Are galaxies scattered at random, or do they form a cosmic web?','What is a dispersion measure?','What can the delay between the two frequencies tell you, and what is a dispersion measure?'],
 es:['¿El universo está quieto o se expande?','¿Las galaxias están repartidas al azar o forman una red cósmica?','¿Qué es la medida de dispersión?','¿Qué te dice el retraso entre las dos frecuencias y qué es la medida de dispersión?'],
 'pt-br':['O universo está parado ou em expansão?','As galáxias estão espalhadas ao acaso ou formam uma teia cósmica?','O que é a medida de dispersão?','O que o atraso entre as duas frequências revela, e o que é a medida de dispersão?'],
 fr:['L’univers est-il immobile ou en expansion ?','Les galaxies sont-elles réparties au hasard ou forment-elles une toile cosmique ?','Qu’est-ce que la mesure de dispersion ?','Que vous apprend le retard entre les deux fréquences, et qu’est-ce que la mesure de dispersion ?'],
 id:['Apakah alam semesta diam atau mengembang?','acak atau jaring kosmik?','Apakah galaksi tersebar secara acak, atau membentuk jaring kosmik?','Apa itu ukuran dispersi?','Apa yang diungkap selisih waktu tiba antara kedua frekuensi, dan apa itu ukuran dispersi?'],
 hi:['क्या ब्रह्मांड स्थिर है, या फैल रहा है?','बेतरतीब या ब्रह्मांडीय जाल?','क्या आकाशगंगाएँ बेतरतीब बिखरी हैं, या ब्रह्मांडीय जाल बनाती हैं?','परिक्षेपण माप क्या है?','दोनों आवृत्तियों के बीच की देरी आपको क्या बताती है, और परिक्षेपण माप क्या है?'],
 ja:['宇宙は静止しているのでしょうか、それとも膨張しているのでしょうか？','ランダムでしょうか、宇宙の網の目でしょうか？','銀河はランダムに散らばっているのでしょうか、それとも宇宙の網の目をつくっているのでしょうか？','分散量度とは何でしょうか？'],
 'zh-hans':['宇宙是静止的，还是在膨胀？','随机分布，还是宇宙网？','星系是随机散布的，还是构成了宇宙网？','什么是色散量？'],
 'zh-hant':['宇宙是靜止的，還是在膨脹？','隨機分布，還是宇宙網？','星系是隨機散布的，還是構成了宇宙網？','什麼是色散量？'],
 ru:['Вселенная неподвижна или расширяется?','хаос или космическая паутина?','Разбросаны ли галактики случайно или образуют космическую паутину?','Что такое мера дисперсии?','О чём говорит запаздывание между двумя частотами и что такое мера дисперсии?'],
};
const SOLAR_SYSTEM:Readonly<Record<string,string>>={en:'solar system',es:'sistema solar','pt-br':'sistema solar',fr:'système solaire',
 id:'tata surya',hi:'सौर मंडल',ja:'太陽系','zh-hans':'太阳系','zh-hant':'太陽系',ru:'солнечн'};
/** Each language's LSS «structure» stem (review N3), allowed only inside the lab's name. */
const STRUCTURE:Readonly<Record<string,string>>={en:'structur',es:'estructur','pt-br':'estrutur',fr:'structur',id:'struktur',hi:'संरचना',
 ja:'構造','zh-hans':'结构','zh-hant':'結構',ru:'структур'};
const kept=(dir:string,lab:LabSlug):readonly string[]=>(KEPT as Record<string,Record<string,readonly string[]>>)[lab]?.[dir]??[];
const kinds=(dir:string)=>Object.values(LAB_MAPS[dir]!.kinds as Record<string,string>).map(k=>k.replace(/\s*[(（].*$/u,''));
/** The strings allowed one result word, by `<slug>.<field>` (review N3). */
const ALLOWED:Readonly<Record<string,(dir:string)=>readonly string[]>>={
 'pulsars.steps.3':dir=>kept(dir,'pulsars'),
 'object-x.steps.3':dir=>[kinds(dir)[4]!],
};
const dirOf=(tag:string)=>tag==='en'?'en':languageEntry(tag)!.dir;
/** Each lab's name in each language, as its pages give it. */
const labName=(dir:string,lab:LabSlug)=>SEO_LANGUAGES.find(l=>dirOf(l.tag)===dir)!.labs.find(l=>l.slug===lab)!.name;
const withoutName=(dir:string,lab:LabSlug,sentence:string)=>{
 const name=labName(dir,lab),at=sentence.toLocaleLowerCase().indexOf(name.toLocaleLowerCase());
 return at<0?sentence:sentence.slice(0,at)+' '+sentence.slice(at+name.length);
};
/** The Object X strings whose five-kind clause is the lab's indirect question. */
const OBJECT_X_CHOICE=new Set(['object-x.description','object-x.intro']);
/** Clauses end at . ! ? । : ; and their full-width forms (a CJK sentence has no space after its mark), so a statement joined to a
 * question by a colon is still a statement: in «…map them in a wedge diagram: random, or a cosmic web?» only the part after it asks. */
const sentences=(text:string)=>text.split(/(?<=[.!?。！？।:;：；])\s*/u).filter(s=>s.trim());
const isQuestion=(sentence:string)=>/[?？]\s*$/u.test(sentence);
/** The result words a page string states; `field` names it (`intro`, `steps.3`…) for the per-string exceptions. */
const pageStatesResult=(dir:string,lab:LabSlug,text:string,field='')=>sentences(text).flatMap(sentence=>{
 const id=`${lab}.${field}`;
 let found=statesResult(dir,lab,withoutName(dir,lab,sentence));
 if(lab==='object-x'){
  if((isQuestion(sentence)||OBJECT_X_CHOICE.has(id))&&kinds(dir).every(kind=>matcher(dir,kind).test(sentence)))found=[];
  if(matcher(dir,SOLAR_SYSTEM[dir]!).test(sentence))found=[...found,SOLAR_SYSTEM[dir]!];
 }
 if(isQuestion(sentence)&&KEPT_QUESTIONS[dir]!.includes(sentence.trim()))found=found.filter(stem=>!kept(dir,lab).includes(stem));
 const allowed=ALLOWED[id]?.(dir)??[];
 return found.filter(stem=>!allowed.includes(stem));
});
const fields=(lab:{title:string;description:string;heading:string;intro:string;steps:readonly string[];learn:readonly string[]})=>[
 ['title',lab.title],['description',lab.description],['heading',lab.heading],['intro',lab.intro],
 ...lab.steps.map((t,i)=>[`steps.${i}`,t]),...lab.learn.map((t,i)=>[`learn.${i}`,t])] as const;

describe('Front NEWCOMER /labs/ texts: the search pages ask, and never answer',()=>{
 it('ten languages, each with the kept keywords, the reviewed questions and the Solar System and structure words',()=>{
  expect(SEO_LANGUAGES.map(l=>dirOf(l.tag)).sort()).toEqual([...DIRS].sort());
  for(const lists of [...Object.values(KEPT),KEPT_QUESTIONS,SOLAR_SYSTEM,STRUCTURE])expect(Object.keys(lists).sort()).toEqual([...DIRS].sort());
  // A kept keyword and the structure stem are their lab's result words, so the listed exceptions are the only way they pass.
  for(const [lab,lists] of Object.entries(KEPT))for(const [dir,words] of Object.entries(lists))for(const word of words)expect(RESULT[lab as keyof typeof KEPT][dir]).toContain(word);
  for(const [dir,stem] of Object.entries(STRUCTURE))expect(RESULT['large-scale-structure'][dir]).toContain(stem);
 });
 for(const L of SEO_LANGUAGES){
  const dir=dirOf(L.tag);
  it(`${dir}: each lab's title, description, heading, intro, steps and learn list state none of its guide's results`,()=>{
   for(const lab of L.labs)for(const [field,text] of fields(lab))expect(pageStatesResult(dir,lab.slug,text,field),`${dir} ${lab.slug}.${field}: ${text}`).toEqual([]);
  });
  it(`${dir}: every reviewed question is on a page, and each kept keyword is still on its page`,()=>{
   const clauses=new Set(L.labs.flatMap(lab=>fields(lab).flatMap(([,text])=>sentences(text).map(s=>s.trim()))));
   for(const question of KEPT_QUESTIONS[dir]!)expect(clauses.has(question),`${dir}: ${question}`).toBe(true);
   for(const lab of L.labs){
    const words=kept(dir,lab.slug);if(!words.length)continue;
    const page=fields(lab).map(([,text])=>text).join(' ');
    expect(words.some(word=>matcher(dir,word).test(page)),`${dir} ${lab.slug}`).toBe(true);
   }
  });
 }
 it('the check bites: the former /labs/ sentences and unreviewed questions are caught, the reviewed questions pass',()=>{
  expect(pageStatesResult('en','hubble','From your own measurements you build a Hubble diagram and estimate the expansion rate of the universe.')).toEqual(['expan']);
  expect(pageStatesResult('en','hubble','Is the universe standing still, or expanding?')).toEqual([]);
  expect(pageStatesResult('en','hubble','Why do farther galaxies recede faster?')).toEqual(['faster','farther']);
  // Review N2: a question is not enough; only the reviewed clauses pass.
  expect(pageStatesResult('en','hubble','How fast is the universe expanding?')).toEqual(['expan']);
  expect(pageStatesResult('en','large-scale-structure','What shape does the cosmic web take?')).toEqual(['cosmic web']);
  expect(pageStatesResult('en','large-scale-structure','Survey a strip of sky and plot a wedge diagram of the cosmic web. Do they form a cosmic web?')).toEqual(['cosmic web','cosmic web']);
  expect(pageStatesResult('en','large-scale-structure','Walls, filaments and voids appear in your own data.')).toEqual(['wall','void','filament']);
  expect(pageStatesResult('en','large-scale-structure','Plot the cosmic web: is it there?')).toEqual(['cosmic web']);
  // Review N1 and N3: the former step, and «structure» outside the title and heading.
  expect(pageStatesResult('en','large-scale-structure','Describe the structures you see and save your investigation.','steps.3')).toEqual(['structur']);
  expect(pageStatesResult('en','large-scale-structure','Large-scale structure lab (CLEA VIREO) · OpenVireo','title')).toEqual([]);
  expect(pageStatesResult('zh-hans','large-scale-structure','这是大尺度结构实验。')).toEqual([]);
  expect(pageStatesResult('en','large-scale-structure','Galaxies form a structure.','learn.1')).toEqual(['structur']);
  expect(pageStatesResult('en','stellar-classification','Which absorption lines mark hot and cool stars.')).toEqual(['hot$','cool$']);
  expect(pageStatesResult('en','pulsars','The delay between frequencies reveals how much interstellar matter the signal crossed.')).toEqual(['interstellar']);
  expect(pageStatesResult('en','pulsars','How dispersion delays low-frequency radio signals.')).toEqual(['dispersion']);
  expect(pageStatesResult('en','pulsars','Compare your results with the dispersion measure.','steps.2')).toEqual(['dispersion']);
  expect(pageStatesResult('en','object-x','How motion between images reveals a Solar System body.')).toEqual(['solar system']);
  expect(pageStatesResult('en','object-x','Is it a star, a galaxy, a quasar, a pulsar or an asteroid?')).toEqual([]);
  // Review N2: the five kinds named in a statement outside the description and intro give nothing away only as a question.
  expect(pageStatesResult('en','object-x','It is a star, a galaxy, a quasar, a pulsar or an asteroid.','learn.0')).toEqual(['star','galaxy','quasar','pulsar','asteroid']);
  expect(pageStatesResult('en','object-x','It moves like an asteroid.')).toEqual(['asteroid']);
  expect(pageStatesResult('en','object-x','It moves like an asteroid.','steps.3')).toEqual([]);
  expect(pageStatesResult('fr','large-scale-structure','Murs, filaments et vides apparaissent dans vos propres données.')).toEqual(['murs$','vide','filament']);
  expect(pageStatesResult('fr','large-scale-structure','Forment-elles une toile cosmique ?')).toEqual(['toile cosmique']);
  expect(pageStatesResult('ja','large-scale-structure','宇宙の網の目構造を扇形図に描きます。')).toEqual(['網の目','構造']);
  expect(pageStatesResult('ja','large-scale-structure','ランダムでしょうか、宇宙の網の目でしょうか？')).toEqual([]);
  expect(pageStatesResult('ru','pulsars','Что мера дисперсии подсказывает о расстоянии до пульсара.')).toEqual(['дисперси']);
  expect(pageStatesResult('zh-hans','object-x','图像之间的运动如何揭示一个太阳系天体。')).toEqual(['太阳系']);
  // Review N7: Hindi «विस्तार» is the expansion only as a whole word, not «विस्तार से» (in detail) nor «विस्तारित» (extended).
  expect(pageStatesResult('hi','hubble','फिर ब्रह्मांड के विस्तार की दर का अनुमान लगाएँ।')).toEqual(['विस्तार(?![  ]+से)$']);
  expect(pageStatesResult('hi','hubble','चरणों को विस्तार से पढ़ें।')).toEqual([]);
  expect(pageStatesResult('hi','hubble','विस्तारित सूची देखें।')).toEqual([]);
 });
});

// Front NEWCOMER NC7 (plan §2.7; user decision of 2026-11-24): the glossary definitions (`term.*`, help/glossary.tsx) are
// textbook-neutral: a definition states none of the results of the guides whose window marks its term (by the English snapshot,
// src/i18n/terms.en.json, whose keys gate every language), in any language, through the same per-language result lists. The
// windows by key prefix; the cluster guide uses the Pleiades list, as its why-line does. A term no window marks (the HR diagram:
// the guides name it only as controls) is checked against every list. Allowed, one word each: the dispersion measure's own name
// (its language's «dispersion» stem). Object X: a definition its window shows names none of the five kinds.
const TERM_LAB:Readonly<Record<string,LabSlug>>={'lab.':'hubble','lssLab.':'large-scale-structure','classLab.':'stellar-classification',
 'pleiadesLab.':'pleiades','clusterLab.':'cluster-hr','pulsarLab.':'pulsars','objectXGuide.':'object-x'};
const TERM_IDS=Object.keys(en).filter(k=>/^term\.(?!label$|close$|wordsHeading$)/u.test(k)).map(k=>k.slice('term.'.length));
const termLabs=(id:string):LabSlug[]=>{
 const labs=new Set<LabSlug>();
 for(const [key,entries] of Object.entries(TERMS_EN as Record<string,(string|number)[][]>))if(entries.some(e=>e[0]===id)){const prefix=Object.keys(TERM_LAB).find(p=>key.startsWith(p));if(prefix)labs.add(TERM_LAB[prefix]!);}
 return labs.size?[...labs]:LAB_SLUGS.filter(lab=>lab!=='object-x');
};
const TERM_ALLOWED:Readonly<Record<string,(dir:string)=>readonly string[]>>={dispersionMeasure:dir=>kept(dir,'pulsars')};
const definitionStates=(dir:string,id:string,text:string)=>termLabs(id).flatMap(lab=>statesResult(dir,lab,text)).filter(stem=>!(TERM_ALLOWED[id]?.(dir)??[]).includes(stem));
describe('Front NEWCOMER NC7: the glossary definitions never answer',()=>{
 it('sixteen terms; the Hubble, LSS, classification, cluster, pulsar and Object X windows each mark some',()=>{
  expect(TERM_IDS).toHaveLength(16);
  const marked=new Set(TERM_IDS.flatMap(termLabs));
  for(const lab of LAB_SLUGS)expect(marked.has(lab),lab).toBe(true);
 });
 for(const dir of DIRS)it(`${dir}: each definition states none of the results of the guides that show it`,()=>{
  const c=catalog(dir);
  for(const id of TERM_IDS){
   const text=c[`term.${id}`]!;
   expect(definitionStates(dir,id,text),`${dir} ${id}: ${text}`).toEqual([]);
  }
 });
 it('the check bites: a textbook pulsar or dispersion measure that explains the result is caught',()=>{
  expect(definitionStates('en','pulsar','Pulsar: a rapidly rotating neutron star.')).toEqual(['neutron','rotat']);
  expect(definitionStates('en','dispersionMeasure','Dispersion measure (DM): the number of free electrons along the line of sight.')).toEqual(['electron']);
  expect(definitionStates('en','spectrum','Spectrum: the light of a quasar spread out by wavelength.')).toEqual(['quasar']);
  expect(definitionStates('en','mainSequence','Main sequence: the band where hot young stars lie.')).toEqual(['hot$','young']);
  expect(definitionStates('ru','redshift','Красное смещение растёт с расстоянием.')).toEqual(['растёт']);
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
 ['hubble','hubble-lab',c=>html(createElement(HubbleLabGuide,{dialogRef:ref,progress:{...hubbleLabProgress([],[],EMPTY_HUBBLE),...c?{next:'interpret' as const}:{}},onNavigate:noop,onNext:noop,onVersion:noop,version:'full' as const}))],
 ['large-scale-structure','lss-lab',c=>html(createElement(LssLabGuide,{dialogRef:ref,progress:{...lssLabProgress(INITIAL_LSS_LAB_SUMMARY),...c?{next:'done' as const}:{}},onNavigate:noop,onNext:noop}))],
 ['object-x','objectx-lab',c=>html(createElement(ObjectXLabGuide,{dialogRef:ref,progress:{...objectXLabProgress(INITIAL_OBJECT_X_LAB_SUMMARY),...c?{next:'done' as const}:{}},onNavigate:noop,onNext:noop}))],
 ['stellar-classification','classification-lab',c=>html(createElement(ClassificationLabGuide,{dialogRef:ref,progress:{...classificationLabProgress(EMPTY_CLASSIFICATION_WORKSPACE,EMPTY_CLASSIFICATION_EXERCISE_SUMMARY),...c?{next:'save' as const}:{}},onNavigate:noop,onNext:noop}))],
 ['cluster-hr','cluster-lab',c=>html(createElement(ClusterLabGuide,{dialogRef:ref,progress:clusterLabProgress({loaded:true,inspected:c,validTrial:c,confirmed:c,reportOpened:c}),cluster:null,onNavigate:noop,own:clusterOwnStatus(0,10,false),onNext:noop}))],
 ['pulsars','pulsar-lab',c=>html(createElement(PulsarLabGuide,{dialogRef:ref,progress:{...pulsarLabProgress({radio:INITIAL_RADIO_EXERCISE_SUMMARY,analysis:EMPTY_PULSAR_MEASUREMENT_SUMMARY,captureRows:0}),...c?{next:'save' as const}:{}},onNavigate:noop,onNext:noop}))],
 ['pleiades','pleiades-lab',c=>html(createElement(PleiadesLabGuide,{dialogRef:ref,progress:{...pleiadesLabProgress({list:true,pointed:false,photometer:EMPTY_PLEIADES_EXERCISE_SUMMARY}),...c?{next:'save' as const}:{}},onNavigate:noop,onNext:noop,onVersion:noop,version:'full' as const}))],
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
  // Front NEWCOMER NC6: the lab's computed time and level, and the computed-not-measured note, follow the why-line.
  // Front NEWCOMER NC7: the why-line may mark glossary terms (<button class="term">), so its text is read without tags.
  const lead=new RegExp(`<p id="${prefix}-why" class="lab-why">((?:(?!</p>).)+)</p><p id="${prefix}-why-facts" class="lab-facts"><span class="lab-facts-line">((?:<span class="lab-fact">[^<]+</span>(?: · )?)+)</span> <span class="lab-facts-note">${E['home.estimateNote']}</span></p>(?:<div class="lab-version">(?:(?!<details).)*)?<details class="research-notes"><summary>${E['notes.summary']}</summary><p>([^<]+)</p>`).exec(open);
  expect(lead,lab).not.toBeNull();
  expect(lead![1]!.replace(/<[^>]+>/g,'')).toBe(esc(why('en',lab)));
  const f=LAB_FACTS[lab],level=E[`home.level${f.level}`]!,range=(m:readonly number[])=>({low:String(m[0]),high:String(m[1])});
  const fill=(text:string,v:Record<string,string>)=>text.replace(/\{(\w+)\}/g,(_,k:string)=>v[k]!);
  expect(lead![2]!.replace(/<[^>]+>/g,'')).toBe([fill(E['home.time']!,range(f.full)),level,...(f.quick?[fill(E['home.quickTime']!,range(f.quick))]:[])].join(' · '));
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
 const hubble=(goal:number,closing:boolean)=>html(createElement(HubbleLabGuide,{dialogRef:ref,progress:{...hubbleLabProgress([],[],EMPTY_HUBBLE,goal),...closing?{next:'interpret' as const}:{}},onNavigate:noop,onNext:noop,onVersion:noop,version:goal<13?'quick' as const:'full' as const}));
 const pleiades=(goal:number,closing:boolean)=>html(createElement(PleiadesLabGuide,{dialogRef:ref,progress:{...pleiadesLabProgress({list:true,pointed:false,photometer:EMPTY_PLEIADES_EXERCISE_SUMMARY,goal}),...closing?{next:'save' as const}:{}},onNavigate:noop,onNext:noop,onVersion:noop,version:goal<24?'quick' as const:'full' as const}));
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
