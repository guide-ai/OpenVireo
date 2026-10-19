import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {webcrypto,createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import grid from '../../data/classification/printed-grid.json';
import {CLASSIFICATION_IMPORT_POLICY,classificationImportDifferenceAllowed,checkClassificationImports} from '../core/classificationImport';
import {CLASSIFICATION_CATALOG as catalog,EMPTY_CLASSIFICATION_WORKSPACE,INITIAL_CLASSIFICATION,openImportedClassification,openAcquiredClassification,currentClassification,updateClassification,classificationRecord,classificationCsv,classificationExternalSources,readClassificationWorkspace} from '../core/classification';
import {readClassificationImport} from './classificationImports';
import {serializeAnalysisSession,readAnalysisSession,readInvestigationSession} from './analysisSession';
import {serializeClassificationSession} from './classificationSession';
import {verifyImportedSpectrumText,readImportedSpectrum} from './spectrumFiles';
import {createStarObservation} from './starObservation';
import {createStarExposure,activateStar,startStar,tickStar,pauseStar} from '../core/starExposure';
import {INITIAL_CONTROL,createMeasurement,parseLibrarySpectrum} from '../core/spectrum';
import {EMPTY_HUBBLE} from '../core/hubbleAnalysis';
import {EMPTY_FEATURES} from '../core/featureWidth';
const raw=readFileSync(new URL('../../public/original/classification/A0000001.SP',import.meta.url));
const small=(i=0)=>`3900 .${i+1}\n4150 .5\n4500 1\n`;
const file=(text:string|Uint8Array=raw,name='same.sp')=>new File([typeof text==='string'?text:new Uint8Array(text).slice().buffer],name);
const read=(text:string)=>readAnalysisSession(new File([text],'all.json'));
beforeEach(()=>{vi.stubGlobal('crypto',webcrypto);vi.stubGlobal('fetch',vi.fn(async(url:string)=>new Response(readFileSync(new URL('../../public'+url,import.meta.url)))));});afterEach(()=>vi.unstubAllGlobals());
it('binds the derived exact printed grid to every original atlas and preserves a BOM import byte-for-byte',async()=>{
 expect(createHash('sha256').update(raw).digest('hex')).toBe(grid.sourceSha256);
 for(const a of catalog.atlases)for(const s of a.standards)expect(parseLibrarySpectrum(readFileSync(new URL('../../public'+s.url,import.meta.url),'utf8')).map(p=>p.wavelength)).toEqual(grid.wavelengths);
 const bytes=Buffer.concat([Buffer.from([239,187,191]),raw]),p=await readClassificationImport(file(bytes));expect(p.kind).toBe('imported-spectrum');expect(new TextEncoder().encode(p.sourceText)).toEqual(new Uint8Array(bytes));expect(classificationImportDifferenceAllowed(p)).toBe(true);expect((await verifyImportedSpectrumText(p.sourceText,p.sha256)).samples).toEqual(p.samples);
});
it('reuses marker-based SSP parsing and claims without granting origin or silently clipping signed data',async()=>{
 const text='*SpHdr* Claimed star,12.5,-2.5\n'+Array.from({length:600},(_,i)=>`${3700+i*2} ${i===1?'.5':'1'}`).join('\n')+'\n',p=await readClassificationImport(file(text,'not-an-ssp.csv'));expect(p.legacyHeader?.object).toBe('Claimed star');expect(p.kind).toBe('imported-spectrum');expect(p).not.toHaveProperty('acquisitionId');expect(classificationImportDifferenceAllowed(p)).toBe(false);
 const signed=text.replace('3700 1','3700 -.5');expect((await readImportedSpectrum(file(signed))).samples[0].intensity).toBe(-.5);await expect(readClassificationImport(file(signed))).rejects.toThrow();await expect(readClassificationImport(file(text.split('\n').slice(0,-2).join('\n')))).rejects.toThrow();
});
it('rejects malformed, partial, out-of-domain, oversize or unnormalized files before adding a comparison source',async()=>{
 for(const s of ['garbage','3900 0\n3900 1\n4500 1\n','4000 0\n4500 1\n','3900 0\n4400 1\n','3900 0\n4500 2\n','3900 NaN\n4500 1\n'])await expect(readClassificationImport(file(s))).rejects.toThrow();let read=false;await expect(readClassificationImport({size:2*1024*1024+1,name:'large.sp',arrayBuffer:async()=>{read=true;return new ArrayBuffer(0);}} as File)).rejects.toThrow();expect(read).toBe(false);
});
it('retains independent filename collisions, practice/acquired work and idempotent repeats under archive limits',async()=>{
 const p=await readClassificationImport(file(small())),q=await readClassificationImport(file(small(1))),star=await createStarObservation(pauseStar(tickStar(startStar(activateStar(createStarExposure(1))),1000))),base=openAcquiredClassification({...EMPTY_CLASSIFICATION_WORKSPACE,practice:{...INITIAL_CLASSIFICATION,features:EMPTY_FEATURES,proposed:'Practice draft'}},star),w=openImportedClassification(base,p),draft={...currentClassification(w),proposed:'Own imported proposal',reason:'Own evidence'},saved=updateClassification(w,{...draft,records:[classificationRecord(draft,[p])]}),repeat=openImportedClassification(saved,{...p,name:'another-name.sp'}),next=openImportedClassification(repeat,q);
 expect(repeat).toEqual(saved);expect(next.imports).toHaveLength(2);expect(next.imports![0].source.name).toBe('same.sp');expect(next.imports![0].state.proposed).toBe('Own imported proposal');expect(next.practice).toEqual(base.practice);expect(next.acquired).toEqual(base.acquired);expect(readClassificationWorkspace(next,[star])).toEqual(next);
 let full=next;for(const i of [2,3])full=openImportedClassification(full,await readClassificationImport(file(small(i))));expect(()=>openImportedClassification(full,{...p,sha256:'f'.repeat(64)})).toThrow();expect(()=>checkClassificationImports([{...p,sourceText:' '.repeat(2*1024*1024)},{...q,sourceText:' '.repeat(2*1024*1024)},{...p,sha256:'f'.repeat(64)}])).toThrow();
});
it('guards every wavelength rather than endpoint or length guesses and rejects forged difference/width contexts',async()=>{
 const p=await readClassificationImport(file()),changed=await readClassificationImport(file(raw.toString().replace('3511.4','3511.41')));expect(classificationImportDifferenceAllowed(changed)).toBe(false);let w=openImportedClassification(EMPTY_CLASSIFICATION_WORKSPACE,changed);expect(()=>readClassificationWorkspace(updateClassification(w,{...currentClassification(w),mode:'difference'}),[])).toThrow();w=openImportedClassification(EMPTY_CLASSIFICATION_WORKSPACE,p);expect(readClassificationWorkspace(updateClassification(w,{...currentClassification(w),mode:'difference'}),[]).imports![0].state.mode).toBe('difference');expect(()=>readClassificationWorkspace(updateClassification(w,{...currentClassification(w),features:EMPTY_FEATURES}),[])).toThrow();
});
it('roundtrips v7 with exact file bytes, original practice features, raw replay and manual measurement bits',async()=>{
 const p=await readClassificationImport(file(raw,'=FILE.sp')),star=await createStarObservation(pauseStar(tickStar(startStar(activateStar(createStarExposure(1))),1000))),control={...INITIAL_CONTROL,step:.001,position:2},row=createMeasurement(1,'Own star',star.name,star.sha256,control,'BALMER.LST',{kind:star.kind,acquisitionId:star.acquisitionId});let w=openImportedClassification(openAcquiredClassification({...EMPTY_CLASSIFICATION_WORKSPACE,practice:{...INITIAL_CLASSIFICATION,features:EMPTY_FEATURES}},star),p);const draft={...currentClassification(w),mode:'difference' as const,proposed:'Own class',reason:'Own uncertain features'};w=updateClassification(w,{...draft,records:[classificationRecord(draft,[p])]});
 const text=await serializeAnalysisSession({observation:star,acquisitions:[star],rows:[row],control,stepInput:'.001',reference:'balmer',wide:false,object:'Own star',hubble:EMPTY_HUBBLE,classification:w}),portable=JSON.parse(text),restored=await read(text);expect(portable.version).toBe(7);expect(portable.classification.importPolicy).toBe(CLASSIFICATION_IMPORT_POLICY);expect(portable.classification.workspace.imports[0].source).toEqual({name:p.name,sha256:p.sha256,sourceText:p.sourceText});expect(restored.classification).toEqual(w);expect(restored.rows[0].zFloat32Hex).toBe(row.zFloat32Hex);expect(restored.acquisitions![0].state.exposure).toEqual(star.state.exposure);
 const csv=classificationCsv(currentClassification(w),classificationExternalSources(w,[star]));expect(csv.split('\r\n')[1]).toMatch(/^4,/);expect(csv).toContain('imported-spectrum');expect(csv).toContain("'=FILE.sp");expect(csv).toContain(p.sha256);expect(csv).toContain('source_sha256');expect(csv).not.toContain('acquired-star');
});
it('rejects wrong digests, policies, extra cached samples, duplicate imports and older-schema smuggling',async()=>{
 const p=await readClassificationImport(file()),w=openImportedClassification(EMPTY_CLASSIFICATION_WORKSPACE,p),text=await serializeAnalysisSession({observation:null,rows:[],control:INITIAL_CONTROL,stepInput:'',reference:'galaxy',wide:false,object:'',hubble:EMPTY_HUBBLE,classification:w});
 for(const change of [(v:any)=>v.classification.importPolicy='fake',(v:any)=>v.classification.workspace.imports[0].source.sha256='0'.repeat(64),(v:any)=>v.classification.workspace.imports[0].source.samples=p.samples,(v:any)=>v.classification.workspace.imports.push(v.classification.workspace.imports[0]),(v:any)=>{v.version=6;delete v.classification.importPolicy;},(v:any)=>v.classification.workspace.imports[0].state.unknownId='u1']){const v=JSON.parse(text);change(v);await expect(read(JSON.stringify(v))).rejects.toThrow();}expect(currentClassification(w).proposed).toBe('');
});
it('merges a practice-only session without deleting imported sources or their responses',async()=>{
 const p=await readClassificationImport(file()),w=openImportedClassification(EMPTY_CLASSIFICATION_WORKSPACE,p),incoming=await readInvestigationSession(new File([serializeClassificationSession({...INITIAL_CLASSIFICATION,proposed:'New practice'})],'practice.json'));expect(incoming.kind).toBe('practice');if(incoming.kind!=='practice')throw Error();const merged=readClassificationWorkspace({...w,practice:incoming.state,active:'practice'},[]);expect(merged.imports).toEqual(w.imports);expect(merged.practice.proposed).toBe('New practice');
});
