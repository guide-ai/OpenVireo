import {describe,expect,it} from 'vitest';
import {spectrometerPrintAxis,spectrometerPrintPage,type SpectrometerPrintInput} from './spectrometerPrint';

// Front RE6: research analysis/front-re5/spectrometer-print.md §3–§5 (0x510294).
const OFF={showObjectId:false,showObjectMag:false,editMode:false},ON={showObjectId:true,showObjectMag:true,editMode:false};
const counts=Array.from({length:600},(_,i)=>i===0?-20:i===99?400:100);
const base:SpectrometerPrintInput={counts,minimum:3900,maximum:4500,elapsedMs:61_250,total:60_520.4,pointing:{ra:12.5,dec:-5.25},sky:false,object:{status:'object',name:'N0000-01634',kind:0,v:6},options:OFF};
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
  expect(txt({...base,options:ON,object:{status:'object',name:'X'.repeat(30),kind:0,v:1}}).object).toBe(`16,260 Object: ${'X'.repeat(24)}`);
 });
});
