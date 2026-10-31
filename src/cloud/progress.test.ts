import {afterEach,describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import old from '../../data/photometry/pre-native-cluster-fixtures.json';
import clusterCaptures from '../../data/photometry/pre-cluster-comparison-fixtures.json';
import mayall from '../../data/photometry/pre-photometer-mayall-fixture.json';
import {readAnalysisSession,serializeAnalysisSession,type AnalysisSession} from '../io/analysisSession';
import {EMPTY_CLUSTER_DATABASE} from '../core/clusterDatabase';
// The worker's pure progress sniffer (no Workers types, no scientific code): imported, not copied.
import {SECTION_EXERCISES,investigationShape} from '../../worker/src/progress';

// Front A review 1 L6: the worker detects exercise work by section names of the saved file. These tests tie those
// names to src/io/analysisSession.ts and to real saved files, so a renamed or new section fails here instead of
// silently dropping progress.
afterEach(()=>vi.unstubAllGlobals());
const analysisSource=readFileSync(new URL('../io/analysisSession.ts',import.meta.url),'utf8');
/** Wrapper sections that are settings, not exercise work. */
// Front G G4c: the field spectrometer at any pointing (v33) never counts toward an exercise.
const NOT_EXERCISE_WRAPPERS=new Set(['motion','observatory','fieldSpectrum']);

/** What the app's own reader says the file holds, mapped to exercises independently of the worker's sniffing. */
function expectedExercises(s:AnalysisSession):string[]{
 const found=new Set<string>();
 if(s.rows.length)found.add('E01');if(s.lss)found.add('E02');if(s.classification)found.add('E03');if(s.photometry)found.add('E04');
 if(s.clusterDatabase||s.clusterComparison||s.clusterSelection)found.add('E05');if(s.radio)found.add('E06');if(s.objectX)found.add('E08');
 return ['E01','E02','E03','E04','E05','E06','E08'].filter(e=>found.has(e));
}

describe('Front A progress sniffing against analysisSession.ts',()=>{
 it('knows every wrapper section that portable() emits',()=>{
  const wrappers=new Set([...analysisSource.matchAll(/session\.(\w+)!==undefined/g)].map(m=>m[1]));
  expect(wrappers.size).toBeGreaterThan(5);
  for(const key of wrappers)expect(NOT_EXERCISE_WRAPPERS.has(key)||key in SECTION_EXERCISES,`unmapped session section "${key}"`).toBe(true);
  for(const key of Object.keys(SECTION_EXERCISES).filter(k=>!['classification','photometry'].includes(k)))expect(wrappers.has(key),`worker section "${key}" no longer emitted`).toBe(true);
 });
 it('a v33 field-spectrum wrapper is no exercise and still lets the sniffer reach the sections below it',()=>{
  const v={format:'OpenVireo analysis session',version:33,base:{format:'OpenVireo analysis session',version:28,objectX:{},base:{version:2,measurements:[{id:1}]}},fieldSpectrum:{}};
  expect(investigationShape(v)?.exercises).toEqual(['E01','E08']);
 });
 it('reads the innermost keys the plain session record still uses',()=>{
  const record=analysisSource.split('\n').find(line=>/record\(value,\[/.test(line)&&line.includes("'adjustment'"))??'';
  for(const key of ['measurements','classification','photometry'])expect(record).toContain(`'${key}'`);
  expect(analysisSource).toContain('base:await portable(');
 });
});

describe('Front A progress sniffing on real saved files',()=>{
 it('matches the app reader on captured saves and a freshly serialized cluster session',async()=>{
  vi.stubGlobal('crypto',webcrypto);
  vi.stubGlobal('fetch',async(url:unknown)=>new Response(readFileSync(new URL('../../data/photometry/'+String(url).split('/').at(-1)!.split('?')[0],import.meta.url))));
  const texts=[old.full2.text,mayall.full21.text,...clusterCaptures.fixtures.map(f=>f.text)];
  const base=await readAnalysisSession(new File([old.full2.text],'full2.json'));
  texts.push(await serializeAnalysisSession({...base,clusterDatabase:{...EMPTY_CLUSTER_DATABASE,pendingId:'m67',loaded:true}}));
  const seen=new Set<string>();
  for(const text of texts){
   const session=await readAnalysisSession(new File([text],'saved.json'));
   const shape=investigationShape(JSON.parse(text));
   expect(shape?.format).toBe('OpenVireo analysis session');
   expect(shape?.exercises).toEqual(expectedExercises(session));
   shape?.exercises.forEach(e=>seen.add(e));
  }
  // The real files exercise more than one section kind.
  expect([...seen].sort()).toEqual(expect.arrayContaining(['E04','E05']));
 });
});
