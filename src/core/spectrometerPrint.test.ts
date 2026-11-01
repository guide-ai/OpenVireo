import {describe,expect,it} from 'vitest';
import {roundNearestEven} from './numericPolicy';
import {spectrometerPrintAxis,spectrometerPrintPage,type SpectrometerPrintInput} from './spectrometerPrint';

// Front RE6: research analysis/front-re5/spectrometer-print.md §3–§5 (0x510294).
const OFF={showObjectId:false,showObjectMag:false,editMode:false},ON={showObjectId:true,showObjectMag:true,editMode:false};
const counts=Array.from({length:600},(_,i)=>i===0?-20:i===99?400:100);
const base:SpectrometerPrintInput={counts,minimum:3900,maximum:4500,elapsedMs:61_250,total:60_520.4,pointing:{ra:12.5,dec:-5.25},sky:false,object:{status:'object',name:'N0000-01634',kind:0,v:6,ra:12.5,dec:-5.25},options:OFF};
describe('spectrometer print body',()=>{
 it('default 3900–4500: n 6, M 100, 60 bottom ticks (majors every 100 units), labels 3900…4500 at x 9…609, 50 left ticks',()=>{
  expect(spectrometerPrintAxis(3900,4500)).toMatchObject({start:3900,end:4500,n:6,major:100,minor:10,perChannel:1});
  const p=spectrometerPrintPage(base),bottom=p.ticks.filter(t=>t.y1===220);
  expect(bottom).toHaveLength(60);expect(bottom.filter(t=>t.y2===210).map(t=>t.x1)).toEqual([126,226,326,426,526,626]);
  expect(p.texts.filter(t=>t.role==='label').map(t=>[t.x,t.text])).toEqual([[9,'3900'],[109,'4000'],[209,'4100'],[309,'4200'],[409,'4300'],[509,'4400'],[609,'4500']]);
  const left=p.ticks.filter(t=>t.x1===26&&t.y1===t.y2);expect(left).toHaveLength(50);
  expect(left.find(t=>t.y1===120)!.x2).toBe(41);expect(left.find(t=>t.y1===200)!.x2).toBe(36);expect(left.find(t=>t.y1===216)!.x2).toBe(31);
  expect(p.frame).toEqual([[26,20],[26,220],[626,220]]);
 });
 it('a 1000-Å range (3700–4700, n 10, M 60) labels every 100 Å up to 4700 at x 609',()=>{
  const p=spectrometerPrintPage({...base,minimum:3700,maximum:4700});
  expect(p.texts.filter(t=>t.role==='label').map(t=>[t.x,t.text]).at(-1)).toEqual([609,'4700']);expect(p.texts.filter(t=>t.role==='label')).toHaveLength(11);
 });
 it('trace: counts over their own max = 200 units, x = ch+25, a negative bin below the axis (no clipping)',()=>{
  const p=spectrometerPrintPage(base);expect(p.trace).toHaveLength(600);
  expect(p.trace[0]).toEqual([26,230]);expect(p.trace[99]).toEqual([125,20]);expect(p.trace[1]).toEqual([27,170]);expect(p.trace[599]).toEqual([625,170]);
 });
 it('text block: options off print only the pointing and counts; on add Object and V; sky prints Reading Sky; Edit Mode the magnitude alone',()=>{
  const txt=(i:SpectrometerPrintInput)=>Object.fromEntries(spectrometerPrintPage(i).texts.filter(t=>t.role!=='label'&&t.role!=='axis').map(t=>[t.role,`${t.x},${t.y} ${t.text}`]));
  expect(txt(base)).toEqual({ra:'16,300 Right Ascension:   12h 30m 00.00s',dec:'16,320 Declination:   -5° 15\' 00.0"',integration:'396,260 Integration (Seconds): 61.3',count:'396,280 Photon Count: 60520',average:'396,300 Avg. per Channel: 101',snr:'396,320 Signal/Noise: 10.0'});
  expect(txt({...base,options:ON})).toMatchObject({object:'16,260 Object: N0000-01634',magnitude:'16,280 Apparent Magnitude (V): 6.00'});
  expect(txt({...base,options:ON,sky:true})).toMatchObject({object:'16,260 Reading Sky'});expect(txt({...base,options:ON,sky:true}).magnitude).toBeUndefined();
  expect(txt({...base,options:{...OFF,editMode:true}})).toMatchObject({magnitude:'16,280 Apparent Magnitude (V): 6.00'});
  expect(txt({...base,options:ON,object:{status:'hidden'}}).object).toBeUndefined();
  expect(txt({...base,options:ON,object:{status:'object',name:'X'.repeat(30),kind:0,v:1,ra:0,dec:0}}).object).toBe(`16,260 Object: ${'X'.repeat(24)}`);
 });
 it('review 1 M1: ticks follow VIREO\'s Extended arithmetic; 157 of the 780 dialog ranges differ from binary64',()=>{
  const lengths=(min:number,max:number)=>spectrometerPrintPage({...base,minimum:min,maximum:max}).ticks.filter(t=>t.y1===220).map(t=>[t.x1,220-t.y2]);
  const major=(min:number,max:number)=>new Map(lengths(min,max).map(([x,l])=>[x,l]));
  // 3500–4600 (n 11): k = 50, 70, 100 are minor in Extended (Frac = 0.99999…), at t 273, 382, 545 (x = t + 26).
  const a=major(3500,4600);for(const x of [273,382,545])expect(a.get(x+26),`${x}`).toBe(5);
  // 3500–4800 (n 13): the reverse.
  const b=major(3500,4800);for(const x of [46,92,185,231])expect(b.get(x+26),`${x}`).toBe(10);
  // The binary64 rule, for the count: every dialog range 3500–7400 Å in 100-Å steps.
  const binary=(min:number,max:number)=>{const n=Math.round((max-min)/100),M=600/n,m=M/10,out:number[][]=[];
   for(let k=1;;k++){const t=roundNearestEven(k*m);if(t+26>626)break;const f=k*m/M;out.push([t+26,f-Math.floor(f)<1e-5?10:5]);}return out;};
  let ranges=0,differ=0;
  for(let lo=3500;lo<=7400;lo+=100)for(let hi=lo+100;hi<=7400;hi+=100){ranges++;if(JSON.stringify(lengths(lo,hi))!==JSON.stringify(binary(lo,hi)))differ++;}
  expect(ranges).toBe(780);expect(differ).toBe(157);
  for(const [lo,hi] of [[3700,4700],[3900,4500],[4000,5000]])expect(lengths(lo,hi)).toEqual(binary(lo,hi));
 });
});
