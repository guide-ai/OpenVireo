import{it,expect}from'vitest';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';
import controls from './clusterNativeObservationHr.controls.json';
import{CLUSTER_DATABASE_HR_FRAME,CLUSTER_DATABASE_HR_SLIDERS,clusterDatabaseHrCurveInFrame,clusterDatabaseHrInFrame,clusterDatabaseHrPartition,clusterDatabaseHrReport,clusterDatabaseHrSliderText,clusterDatabaseHrTrial,nativeClusterDraftTicks,nativeClusterDraftWithTicks,type ClusterDatabaseHrSliderField}from'./clusterDatabaseHr';
import{clusterNativeHrFrame,type ClusterNativeHrTrial}from'./clusterNativeObservationHr';
import{clusterDatasetInfo}from'./clusterComparison';
import{nativeClusterDraftFromFit,nativeClusterDraftParameters,type NativeClusterDraft}from'./nativeCluster';
const raw=(file:string)=>readFileSync(new URL('../../data/photometry/'+file,import.meta.url));
const blank:NativeClusterDraft=nativeClusterDraftFromFit(null);
const m67:NativeClusterDraft=Object.freeze({modulus:'9.50',ebv:'0.03',logAge:'9.60',modelIndex:'4',offset:'0',extinctionCorrected:true,interpretation:'My own trial'});

it('30 Doradus: all609 source rows keep ID/order;stored-value native bounds draw606 and name the3 outside rows',()=>{
 const info=clusterDatasetInfo('30dor'),bytes=raw(info.file);expect(createHash('sha256').update(bytes).digest('hex')).toBe('873a87eb3528bd1c04a6f49eff86512a14d1aabd1131c221bcfa1484b53c033a');
 const points=JSON.parse(bytes.toString('utf8'))as{id:string;bMinusV:number;v:number}[];expect(points).toHaveLength(609);expect(new Set(points.map(p=>p.id)).size).toBe(609);
 // Independent control:hard-coded native frame V2..18,B−V−0.5..+2.5 on stored values.
 const inside=points.filter(p=>p.bMinusV>=-.5&&p.bMinusV<=2.5&&p.v>=2&&p.v<=18);
 const part=clusterDatabaseHrPartition(points);expect(part.inside).toEqual(inside);expect(part.inside).toHaveLength(606);
 expect(part.outside.map(p=>p.id)).toEqual(['S6730.DAT@56750','S6730.DAT@57359','S6730.DAT@58515']);
 expect([...part.inside,...part.outside].map(p=>p.id).sort()).toEqual(points.map(p=>p.id).sort());
 for(const p of part.outside)expect(points).toContain(p);
});

it('uses the recovered frame helper geometry and controls;bounds are inclusive on stored values',()=>{
 expect(CLUSTER_DATABASE_HR_FRAME).toEqual({colorMin:-.5,colorMax:2.5,vMin:2,vMax:18});
 const frame=clusterNativeHrFrame();expect(frame.ticks).toHaveLength(controls.frame.tickCount);expect(frame.texts).toHaveLength(controls.frame.textCount);expect(frame.axis).toEqual(controls.frame.axis);
 for(const text of controls.frame.texts)expect(frame.texts).toContainEqual(text);
 for(const p of[{bMinusV:-.5,v:2},{bMinusV:2.5,v:18},{bMinusV:0,v:10}])expect(clusterDatabaseHrInFrame(p)).toBe(true);
 for(const p of[{bMinusV:-.5000001,v:10},{bMinusV:2.5000001,v:10},{bMinusV:0,v:1.9999},{bMinusV:0,v:18.0001},{bMinusV:NaN,v:10}])expect(clusterDatabaseHrInFrame(p)).toBe(false);
 expect(clusterDatabaseHrCurveInFrame({color:1,v:17})).toBe(true);expect(clusterDatabaseHrCurveInFrame({color:3,v:17})).toBe(false);
});

it('text is the slider source of truth:canonical literal strings,null for blank/invalid/off-grid/out-of-range text',()=>{
 expect(nativeClusterDraftTicks({...m67,offset:'-0.25'})).toEqual({modulus:950,ebv:3,logAge:36,offset:-25});
 expect(nativeClusterDraftTicks(blank)).toEqual({modulus:null,ebv:null,logAge:null,offset:0});
 expect(nativeClusterDraftTicks({...m67,modulus:'15.01',ebv:'abc',logAge:'9.61',offset:'1.01'})).toEqual({modulus:null,ebv:null,logAge:null,offset:null});
 expect(nativeClusterDraftTicks({...m67,modulus:'1e-999',ebv:'2.50',logAge:'10.25',offset:'-1'})).toEqual({modulus:null,ebv:250,logAge:49,offset:-100});
 const cases:[ClusterDatabaseHrSliderField,number,string][]=[['modulus',950,'9.50'],['modulus',0,'0.00'],['modulus',1500,'15.00'],['ebv',3,'0.03'],['ebv',250,'2.50'],['logAge',0,'7.80'],['logAge',36,'9.60'],['logAge',49,'10.25'],['offset',-100,'-1.00'],['offset',-5,'-0.05'],['offset',25,'0.25']];
 for(const[field,n,text]of cases)expect(clusterDatabaseHrSliderText(field,n)).toBe(text);
 for(const field of Object.keys(CLUSTER_DATABASE_HR_SLIDERS)as ClusterDatabaseHrSliderField[]){const r=CLUSTER_DATABASE_HR_SLIDERS[field];for(let n=r.min;n<=r.max;n++)expect(nativeClusterDraftTicks(nativeClusterDraftWithTicks(blank,field,n))[field]).toBe(n);for(const bad of[r.min-1,r.max+1,.5,NaN])expect(()=>clusterDatabaseHrSliderText(field,bad)).toThrow();}
});

it('moving one slider rewrites only its own field;other invalid/blank text and choices stay verbatim',()=>{
 const d={...blank,ebv:'0.03',logAge:'not yet',interpretation:'Keep <this>'};
 const moved=nativeClusterDraftWithTicks(d,'modulus',950);expect(moved).toEqual({...d,modulus:'9.50'});expect(moved.logAge).toBe('not yet');expect(moved.modelIndex).toBe('');expect(nativeClusterDraftParameters(moved)).toBeNull();
 expect(nativeClusterDraftWithTicks(d,'logAge',36)).toEqual({...d,logAge:'9.60'});
});

it('report shows only visible valid sections;literal M67 lines with762 parsecs and3981 million years',()=>{
 const name=clusterDatasetInfo('m67').name,lines=(d:NativeClusterDraft,ready:boolean)=>clusterDatabaseHrReport(name,clusterDatabaseHrTrial(d,ready)).lines;
 expect(lines(blank,true)).toEqual(['Cluster: '+name]);expect(lines({...blank,ebv:'0.03'},true)).toEqual(['Cluster: '+name]);
 expect(lines(m67,false)).toEqual(['Cluster: '+name,'','From ZAMS fit:','  V-Mv = 9.50','  E(B-V) = 0.03','  Estimated Cluster Distance: 762 Parsecs']);
 expect(lines(m67,true)).toEqual(['Cluster: '+name,'','From ZAMS fit:','  V-Mv = 9.50','  E(B-V) = 0.03','  Estimated Cluster Distance: 762 Parsecs','','Isochrone Model Parameters:','  Metallicity: [Z=0.019, Y=0.273] (Solar Values)','  Log(Age/yrs): 9.60','  Estimated Cluster Age: 3981 Million Years','  (B-V) Adjustment: 0.00']);
 // Distance line follows the same option(+0x2e7c);the apparent-modulus distance is never substituted.
 expect(lines({...m67,extinctionCorrected:false},true)).toEqual(['Cluster: '+name,'','From ZAMS fit:','  V-Mv = 9.50','  E(B-V) = 0.03','','Isochrone Model Parameters:','  Metallicity: [Z=0.019, Y=0.273] (Solar Values)','  Log(Age/yrs): 9.60','  Estimated Cluster Age: 3981 Million Years','  (B-V) Adjustment: 0.00']);
 expect(lines({...m67,logAge:'9.61'},true)).toHaveLength(6);expect(lines({...m67,modelIndex:''},true)).toHaveLength(6);
 expect(clusterDatabaseHrReport(name,clusterDatabaseHrTrial(m67,true)).caption).toBe('Cluster Age/Distance Parameters');
 expect(clusterDatabaseHrTrial({...m67,offset:'-0.25',modelIndex:'0',logAge:'10.25'},true)).toEqual({zamsShown:true,modulusTicks:950,ebvTicks:3,isochroneShown:true,modelIndex:0,ageIndex:49,offsetTicks:-25,distanceOption:true});
});

it('only line1 differs from the recovered report controls',()=>{
 for(const r of controls.reports)expect(clusterDatabaseHrReport('Hyades',r.trial as ClusterNativeHrTrial).lines).toEqual(['Cluster: Hyades',...r.lines.slice(1)]);
});
