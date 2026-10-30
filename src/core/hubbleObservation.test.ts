import {describe,expect,it} from 'vitest';
import {confirmHubbleObservation,hubbleObservationFields,observationReuseTarget,openHubbleObservation,readHubbleObservation,portableHubbleObservation,type HubbleObservation} from './hubbleObservation';
import {LSS_DIALOG_TEXT} from './lssRedshiftDialog';

// Front H2: TObsRsltsDlg1 "Observational Data" on the Hubble record path (FormActivate 0x54a91c, OK 0x54b02c, 0x54a73c).
const z=Math.fround(.0168),cz=299792.458*z;
const base={id:'36773',jd:2455000.25,ra:12.5,dec:27.25,zSingle:z,targetMagnitude:Math.fround(13.4),computeRedshiftVelocity:false,reused:null};
describe('Front H2: Hubble Observational Data',()=>{
 it('opens blank, or pre-filled with c·z only when Compute Rdshft Vel. is on and z ≠ 0; V is the catalogue magnitude below 99',()=>{
  const d=openHubbleObservation(base);expect(d.velocityText).toBe('');expect(d.vMagnitude).toBe(Math.fround(13.4));expect(d.reused).toBe(false);
  expect(openHubbleObservation({...base,computeRedshiftVelocity:true}).velocityText).toMatch(/^5\.03\dE\+03$/);
  expect(openHubbleObservation({...base,computeRedshiftVelocity:true,zSingle:0}).velocityText).toBe('');
  expect(openHubbleObservation({...base,targetMagnitude:99}).vMagnitude).toBeNull();
  const f=hubbleObservationFields(d);expect(f.jd).toBe('2455000.250000');expect(f.z).toBe('1.680E-02');expect(f.v).toBe('    13.400');expect(f.ra).toMatch(/^12h 30m 00\.00s$/);
 });
 it('OK stores a typed velocity within 1 % of c·z and refuses the rest with the native texts',()=>{
  const d=openHubbleObservation(base);
  const ok=confirmHubbleObservation(d,{velocityText:String(Math.round(cz)),remarks:'arm',spText:''});
  expect(ok.ok).toBe(true);if(!ok.ok)return;
  expect(ok.observation.velocitySingle).toBe(Math.fround(Math.round(cz)));expect(ok.observation.remarks).toBe('arm');expect(ok.observation.jd).toBe(2455000.25);
  expect(confirmHubbleObservation(d,{velocityText:String(cz*1.02),remarks:'',spText:''})).toEqual({ok:false,caption:null,message:LSS_DIALOG_TEXT.velocityInvalid});
  // Re-pinned 2026-10-30 (H2 review 1 M1): an empty box skips the conversion and the check (je 0x54b1f7 at 0x54b11b) and keeps
  // the z-only record with velocity 0; only non-numeric text (EConvertError) is "incorrect or missing".
  const empty=confirmHubbleObservation(d,{velocityText:'',remarks:'z only',spText:''});
  expect(empty.ok).toBe(true);if(empty.ok){expect(Object.is(empty.observation.velocitySingle,0)).toBe(true);expect(empty.observation.velocityHex).toBe('00000000');expect(empty.observation.remarks).toBe('z only');}
  expect(confirmHubbleObservation(openHubbleObservation({...base,zSingle:0}),{velocityText:'',remarks:'',spText:''}).ok).toBe(true);
  for(const text of [' ','abc'])expect(confirmHubbleObservation(d,{velocityText:text,remarks:'',spText:''})).toEqual({ok:false,caption:LSS_DIALOG_TEXT.velocityCaption,message:LSS_DIALOG_TEXT.velocityMissing});
  expect(confirmHubbleObservation(openHubbleObservation({...base,zSingle:0}),{velocityText:'0',remarks:'',spText:''}).ok).toBe(false);
 });
 it('reuses the first row with the same ID (Time-Dependent Data off), never with it on, and opens on its first time and values',()=>{
  const obs=(confirmHubbleObservation(openHubbleObservation(base),{velocityText:String(Math.round(cz)),remarks:'first',spText:''}) as {observation:HubbleObservation}).observation;
  const g=(targetId:string)=>({kind:'catalog-galaxy-acquisition',targetId});
  const rows=[{origin:g('36747')},{origin:g('36773'),observation:obs},{origin:g('36773'),observation:obs}];
  expect(observationReuseTarget(rows,'36773',false)).toBe(1);expect(observationReuseTarget(rows,'36773',true)).toBeNull();
  expect(observationReuseTarget(rows,'36747',false)).toBeNull();// a row without an observation record is not in VIREO's list
  expect(observationReuseTarget([{origin:g('X'.repeat(16)),observation:obs}],'X'.repeat(16),false)).toBeNull();
  // H2 review 1 M2: the key is the acquisition's catalogue target ID, so two galaxies with the same free label never share a
  // row, and a renamed label still finds its galaxy's row.
  const labelled=[{object:'galaxy',origin:g('36747'),observation:obs},{object:'renamed',origin:g('36773'),observation:obs}];
  expect(observationReuseTarget(labelled,'36773',false)).toBe(1);expect(observationReuseTarget(labelled,'54876',false)).toBeNull();
  const again=openHubbleObservation({...base,jd:2455100,zSingle:Math.fround(.02),reused:obs});
  expect(again.jd).toBe(2455000.25);expect(again.remarks).toBe('first');expect(again.velocityText).toMatch(/^5\.03\dE\+03$/);expect(again.reused).toBe(true);
 });
 it('restore accepts only what OK could store for the row\'s Single z',()=>{
  const obs=(confirmHubbleObservation(openHubbleObservation(base),{velocityText:String(Math.round(cz)),remarks:'r',spText:''}) as {observation:HubbleObservation}).observation;
  const stored=JSON.parse(JSON.stringify(portableHubbleObservation(obs)));
  expect(readHubbleObservation(stored,z)).toEqual(obs);
  expect(()=>readHubbleObservation(stored,Math.fround(.03))).toThrow();// 1 % rule against a different z
  expect(()=>readHubbleObservation({...stored,velocityHex:'zzzzzzzz'},z)).toThrow();
  expect(()=>readHubbleObservation({...stored,extra:1},z)).toThrow();
  expect(()=>readHubbleObservation({...stored,remarks:'x'.repeat(37)},z)).toThrow();
  const zOnly={...stored,velocityHex:'00000000'};expect(readHubbleObservation(zOnly,Math.fround(.03)).velocitySingle).toBe(0);
  expect(()=>readHubbleObservation({...stored,velocityHex:'80000000'},z)).toThrow();
 });
});
