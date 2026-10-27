import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import controls from './ephemeris.controls.json';
import {parseHtl} from './hotList';
import {findOrbitRecord,readOrbitRecord,type OrbitRecord,type Vector3} from './orbitFile';
import {EphemerisError,astrometricPosition,eclipticToEquatorial,elementsFromState,heliocentricPosition,orbitKind,precessEcliptic,separationDegrees,sunGeometric,trueAnomaly,EPHEMERIS_CONSTANTS} from './ephemeris';

type Control=(typeof controls.records)[number];
const record=(c:Control):OrbitRecord=>({index:c.record.index,prefix:c.record.prefix,rawName:c.record.name,name:c.record.name,number:c.record.number,epochJd:c.record.epoch,
 position:c.record.pos as unknown as Vector3,velocity:c.record.vel as unknown as Vector3,centralBody:c.record.body,magnitudeModel:c.record.model,h:c.record.h,g:c.record.g,
 frame:{type:c.record.frame[0],sub:c.record.frame[1],tag:c.record.frame[2],equinoxJd:c.record.frame[3]},flags:c.record.flags});
const wrap=(x:number)=>((x%(2*Math.PI))+2*Math.PI)%(2*Math.PI);
const distance=(a:readonly number[],b:readonly number[])=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const load=(path:string)=>new Uint8Array(readFileSync(new URL(`../../public/original/${path}`,import.meta.url)));

describe('elements from the CMO state vector (0x517af8 + 0x516990/0x5169cc/0x51689c)',()=>{
 it.each(controls.records)('match standard rv→coe for $file $record.name',c=>{
  const el=elementsFromState(record(c)),x=c.elements;
  expect(el.e).toBeCloseTo(x.e,12);
  expect(Math.abs(el.q/x.q-1)).toBeLessThan(1e-11);
  for(const [a,b] of [[el.inclination,x.i],[el.node,x.node],[el.perihelionArgument,x.w]])expect(Math.abs(wrap(a-b+1e-3)-1e-3)).toBeLessThan(1e-10);
  if(el.kind!==2){expect(Math.abs(el.a/x.a-1)).toBeLessThan(1e-11);expect(Math.abs(el.meanMotion/x.n-1)).toBeLessThan(1e-11);}
  // M at the epoch through Tp: n·(epoch − Tp)·86400 ≡ M (mod 2π) for the elliptic and hyperbolic branches.
  if(x.e<0.9999999||x.e>1.0000001){const M=el.meanMotion*(el.epochJd-el.perihelionJd)*86400;expect(Math.abs(x.e<1?wrap(M-x.M+1e-3)-1e-3:M-x.M)).toBeLessThan(2e-7);}
 });
 it('classifies the orbit kind at the recovered limits 0, 0.98 and 1.02',()=>{
  expect([0,1e-9,0.9799999,0.98,1.02,1.0200001,Number.NaN].map(orbitKind)).toEqual([0,1,1,2,2,3,0]);
 });
});

describe('heliocentric propagation (0x516ab0 + 0x517878)',()=>{
 it.each(controls.records)('agrees with universal-variable two-body propagation for $file $record.name',c=>{
  const el=elementsFromState(record(c));
  for(const p of c.positions){const mine=heliocentricPosition(el,p.jd);expect(distance(mine,p.km)/Math.hypot(...p.km)).toBeLessThan(5e-8);}// the original stops at |f| ≤ 1e-10, i.e. δE ≈ 1e-10/(1 − e cos E)
 });
 it('reproduces the stored position at the record epoch',()=>{
  for(const c of controls.records){const el=elementsFromState(record(c));expect(distance(heliocentricPosition(el,c.record.epoch),c.record.pos)).toBeLessThan(1);}
 });
 it('keeps the e = 1 Barker start equation of the original (s³ + 3s = W·dt/3, a factor-9 quirk)',()=>{
  const q=1.2*EPHEMERIS_CONSTANTS.kmPerAu,dt=40,k=EPHEMERIS_CONSTANTS;
  const el={...elementsFromState(record(controls.records.find(c=>c.record.name==='synthetic e=1.008')!)),e:1,kind:2 as const,q,perihelionJd:2455000};
  const s=Math.tan(trueAnomaly(el,2455000+dt)/2),A=Math.sqrt(2/(q/k.kmPerAu))*k.gaussK/(q/k.kmPerAu*2);
  expect(s*s*s+3*s).toBeCloseTo(A*dt/3,9);
 });
 it('raises the original orbit-calculation error where the hyperbolic start has no logarithm',()=>{
  const el=elementsFromState(record(controls.records.find(c=>c.record.name==='synthetic e=2.5')!));
  expect(()=>trueAnomaly(el,el.perihelionJd-4000)).toThrow(EphemerisError);
 });
});

describe('Sun, precession and frames',()=>{
 it.each(controls.sun)('Bretagnon–Simon Sun at JD $jd matches the independent series evaluation',s=>{
  const sun=sunGeometric(s.jd);expect(sun.longitude).toBeCloseTo(s.longitude,11);expect(sun.radiusAu).toBeCloseTo(s.radiusAu,12);
 });
 it('gives the Sun of Meeus example 25.b (1992 Oct 13.0: λ 199°54′21.8″ of date, R 0.99760775) within 10″ (truncated series)',()=>{
  const sun=sunGeometric(2448908.5);
  expect(Math.abs(sun.longitude*180/Math.PI-(199+54/60+21.8/3600))*3600).toBeLessThan(10);
  expect(sun.radiusAu).toBeCloseTo(0.99760775,6);
 });
 it('precesses ecliptic coordinates and back to the same point, leaving equal epochs unchanged',()=>{
  const c={jd:2451545,latitude:0.3,longitude:5.9};
  expect(precessEcliptic(c,2451545)).toBe(c);
  const there=precessEcliptic(c,2488070),back=precessEcliptic(there,2451545);
  expect(there.longitude-c.longitude).toBeCloseTo(50.29*100/3600*Math.PI/180,3);
  expect(back.latitude).toBeCloseTo(c.latitude,10);expect(back.longitude).toBeCloseTo(c.longitude,10);
 });
 it('converts the ecliptic pole and the equinox to their J2000 equatorial positions',()=>{
  const pole=eclipticToEquatorial({jd:2451545,latitude:Math.PI/2,longitude:0});
  expect(pole.ra*180/Math.PI/15+24).toBeCloseTo(18,9);expect(pole.dec*180/Math.PI).toBeCloseTo(66.56070889,7);
  expect(eclipticToEquatorial({jd:2451545,latitude:0,longitude:0})).toEqual({ra:0,dec:0});
 });
});

describe('astrometric position (0x5157b4 mode 2, 0x515b40 and the 0x59940c caller)',()=>{
 it.each(controls.records.filter(c=>c.astrometric.length))('matches the independent light-time chain for $file $record.name',c=>{
  const el=elementsFromState(record(c));
  for(const x of c.astrometric){
   const p=astrometricPosition(el,x.jd);
   expect(separationDegrees(p.raHours,p.decDeg,x.raHours,x.decDeg)*3600).toBeLessThan(0.05);
   expect(Math.abs(p.deltaAu/x.deltaAu-1)).toBeLessThan(1e-8);expect(p.magnitude).toBeCloseTo(x.magnitude,6);
  }
 });
 const htl=parseHtl(load('hotlists/ObjectX.HTL'));
 const at=(file:string,number:string,id:string,jd:number)=>{const bytes=load(`orbit/${file}`);const p=astrometricPosition(elementsFromState(readOrbitRecord(bytes,findOrbitRecord(bytes,{number})!)),jd);const row=htl.find(r=>r.id===id)!;return separationDegrees(p.raHours,p.decDeg,row.ra,row.dec)*3600;};
 const defaultJd=2454983.6666666665;// 2009/06/01 04:00:00 UT, the original Object X default (TUTTimeDlg)
 it('puts Eros and Pluto on their ObjectX.HTL rows at the original default date',()=>{
  expect(at('ObjX_AST.CMO','433','(433) Eros',defaultJd)).toBeLessThan(0.5);
  expect(at('ObjX_AST.CMO','134340','(134340) Pluto',defaultJd)).toBeLessThan(2);
  expect(at('ObjX_MPC.CMO','433','(433) Eros',defaultJd)).toBeLessThan(30);
  expect(at('ObjX_MPC.CMO','134340','(134340) Pluto',defaultJd)).toBeLessThan(5);
 });
 it('matches the 1994 CC row with ObjX_AST.CMO at 06:56 UT that day, but not with the default ObjX_MPC.CMO (two-body across its 2009 close approach)',()=>{
  expect(at('ObjX_AST.CMO','136617','(136617) 1994 CC',2454983.7888)).toBeLessThan(2);
  expect(at('ObjX_MPC.CMO','136617','(136617) 1994 CC',defaultJd)).toBeGreaterThan(3000);
 });
});
