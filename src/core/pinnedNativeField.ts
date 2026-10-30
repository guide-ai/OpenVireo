import{projectResource}from'./projectMetadata';
import skyProfilesSource from '../../data/hubble/sky-telescope-provenance.json';
const skyProfiles=projectResource(skyProfilesSource);

import mayallSource from '../../data/hubble/mayall-provenance.json';
const mayall=projectResource(mayallSource);

import kpno09Source from '../../data/hubble/kpno09-star-provenance.json';
const kpno09=projectResource(kpno09Source);

import regions from '../../data/hubble/native-regions.json';

import starSnapshot from '../../data/hubble/pinned-star-field.json';

import snapshot from '../../data/hubble/pinned-hubble-field.json';

import {traceCompactGscBandRead} from './compactGscReadOrder';
import {nativeCatalogAdmission,type NativeCatalogRegion} from './catalogPopulation';

/** Fixed original configuration only; no generic completeness attestation from
 * navigation data. docs/PINNED-NATIVE-FIELD.md records original-source coverage. */
export class NativeFieldError extends Error {
  constructor(readonly code:'unsupported-domain'|'area'|'region'|'record'|'evidence') {super(`Pinned native field: ${code}`);this.name='NativeFieldError';}
}
export const PINNED_MAYALL_STAR_DOMAIN=Object.freeze({...mayall.star.domain,pointing:Object.freeze({...mayall.star.domain.pointing})});
export const PINNED_KPNO09_STAR_DOMAIN=Object.freeze({...kpno09.domain,pointing:Object.freeze({...kpno09.domain.pointing})});
export const PINNED_STAR_DOMAIN=Object.freeze({...starSnapshot.domain,pointing:Object.freeze({...starSnapshot.domain.pointing})});
export const PINNED_FIELD_DOMAIN=Object.freeze({...snapshot.domain,pointing:Object.freeze({...snapshot.domain.pointing})});
export type NativeRegion=Readonly<{minimumRa:number;maximumRa:number;minimumDec:number;maximumDec:number}>;
export type NativeFieldStar=Readonly<{
  id:string;band:string;recordIndex:number;ra:number;dec:number;magnitude:number;
  photometry2Single:number;photometry3Single:number;auxiliarySingle:number;qualityByte:number;type:0;rawHex:string;
}>;
const fieldBrand:unique symbol=Symbol('pinned-complete-original-population');
export type PinnedNativePopulation=Readonly<{
  [fieldBrand]:true;scope:'pinned-original-population';domain:typeof PINNED_FIELD_DOMAIN;
  area:NativeCatalogRegion;regionIds:readonly number[];bandOrder:readonly string[];
  stars:readonly NativeFieldStar[];galaxies:readonly never[];
  sources:readonly Readonly<{path:string;sha256:string;bytes:number}>[];
}>;
function validRegion(r:NativeRegion):boolean {return !!r&&[r.minimumRa,r.maximumRa,r.minimumDec,r.maximumDec].every(Number.isFinite)&&r.minimumRa>=0&&r.maximumRa<=24&&r.minimumRa<=r.maximumRa&&r.minimumDec>=-90&&r.maximumDec<=90&&r.minimumDec<=r.maximumDec;}
/** 0x5978c0 nonwrapped-field branch: both axis overlaps STRICT. Touching
 * edges do not select a region. Equal/reversed field RA endpoints need the
 * separate native wrap branch and are deliberately unsupported here. */
export function nativeNonwrappedRegionOverlap(area:NativeRegion,region:NativeRegion):boolean {
  if(!validRegion(area)||area.minimumRa>=area.maximumRa)throw new NativeFieldError('area');
  if(!validRegion(region))throw new NativeFieldError('region');
  return area.minimumRa<region.maximumRa&&area.maximumRa>region.minimumRa&&area.minimumDec<region.maximumDec&&area.maximumDec>region.minimumDec;
}
/** 0x5978c0 with both branches (Front G, analysis/front-g-gsc/RE-wrap-polar-consumers.md §G-RE1). The area is the telescope
 * load's folded one (0x53be70): RA bounds in 0..24, min > max for a field across 0 h, and Dec bounds NOT clamped to ±90.
 * - max > min: the nonwrapped branch above (strict).
 * - max ≤ min (`jbe` 0x5978ea): a region starting below 12 h (Single 12.0 at 0x597960) overlaps when area.max > region.min;
 *   any other when area.min < region.max.
 * - Dec in both: area.minDec < region.maxDec and area.maxDec > region.minDec (strict). */
export function nativeRegionOverlap(area:NativeRegion,region:NativeRegion):boolean {
  if(!area||![area.minimumRa,area.maximumRa,area.minimumDec,area.maximumDec].every(Number.isFinite)||area.minimumRa<0||area.minimumRa>24||area.maximumRa<0||area.maximumRa>24||area.minimumDec>=area.maximumDec)throw new NativeFieldError('area');
  if(!validRegion(region))throw new NativeFieldError('region');
  const dec=area.minimumDec<region.maximumDec&&area.maximumDec>region.minimumDec;
  if(area.maximumRa>area.minimumRa)return area.minimumRa<region.maximumRa&&area.maximumRa>region.minimumRa&&dec;
  return (region.minimumRa<12?area.maximumRa>region.minimumRa:area.minimumRa<region.maximumRa)&&dec;
}
/** 0x5977e0 loops region IDs1..9537, preserving increasing order. File row0
 * is retained as the original dummy record; it is NOT region1. A nonwrapped area inside ±90 gives exactly the earlier
 * nonwrapped result (the same strict tests); wrapped and pole-crossing areas take the native wrap branch. */
export function nativeRegionIds(area:NativeRegion):readonly number[] {
  const selected:number[]=[];
  for(let id=1;id<=9537;id++){
    const r=regions.rows[id];if(!r||r.length!==5)throw new NativeFieldError('evidence');
    if(nativeRegionOverlap(area,{minimumRa:r[0],maximumRa:r[1],minimumDec:r[2],maximumDec:r[3]}))selected.push(id);
  }
  // 0x5977e0 keeps the first 100 and shows "Field Contains Too Many Regions!" for each further match; a ±0.375° field never
  // exceeds 12 (G-RE2 measurement), so the web keeps this typed instead of modelling the message.
  if(selected.length>100)throw new NativeFieldError('region');
  return Object.freeze(selected);
}
/** 0x59ae16..0x59ae69 marks bands by first upper region limit>=ID, then
 * iterates bands1..24, not incoming region order or global source RA order. */
export function nativeCompactBandOrder(ids:readonly number[]):readonly string[] {
  if(!Array.isArray(ids)||ids.length>100)throw new NativeFieldError('region');
  const marked=new Set<number>();
  for(const id of ids){if(!Number.isInteger(id)||id<1||id>9537)throw new NativeFieldError('region');let i=0;while(regions.bandUpperLimits[i]<id)i++;marked.add(i);}
  return Object.freeze(regions.bandNames.filter((_name,i)=>marked.has(i+1)));
}
/** 0x59b055..0x59b0af: packed signed integers divide in x87 then store
 * Double coordinates / Single photometry; NO intermediate f32 RA or Dec.
 * This decoder accepts full original signed-int16 magnitudes, not the preview
 * magnitude subset. Type0 and raw quality byte survive, without flag filtering. */
export function decodeNativeCompactRecord(rawHex:string,band:string,index:number):NativeFieldStar {
  if(typeof rawHex!=='string'||!/^[a-f0-9]{54}$/.test(rawHex)||!/^([NS])(0000|0730|1500|2230|3000|3730|4500|5230|6000|6730|7500|8230)$/.test(band)||!Number.isSafeInteger(index)||index<0)throw new NativeFieldError('record');
  const bytes=Uint8Array.from(rawHex.match(/../g)!,v=>parseInt(v,16)),v=new DataView(bytes.buffer);
  const ra=v.getInt32(0,true)/10_000_000,dec=v.getInt32(4,true)/100_000;
  if(ra<0||ra>24||Math.abs(dec)>90)throw new NativeFieldError('record');
  return Object.freeze({id:`${band}.DAT@${index}`,band,recordIndex:index,ra,dec,magnitude:Math.fround(v.getInt16(12,true)/1000),photometry2Single:Math.fround(v.getInt16(14,true)/1000),photometry3Single:Math.fround(v.getInt16(16,true)/1000),auxiliarySingle:Math.fround(v.getInt16(18,true)),qualityByte:v.getUint8(20),type:0,rawHex});
}
function sameDomain(value:unknown,expected:unknown):boolean {
  if(!expected||typeof expected!=='object')return Object.is(value,expected);
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const a=value as Record<string,unknown>,b=expected as Record<string,unknown>;
  return Object.keys(a).length===Object.keys(b).length&&Object.keys(b).every(k=>Object.hasOwn(a,k)&&sameDomain(a[k],b[k]));
}
/** Complete native ordered population for ONLY the pinned fresh-Hubble path.
 * The trusted bundled fixture was generated against WHOLE original files,
 * including all variable/QSO/galaxy/photo-list positions, with source and slice hashes.
 * Replays original binary-seek/read/admission; North then South append order.
 * Non-GSC stages are proven no-ops ONLY in this field/lifecycle. No unsupported
 * pointing, options override, tracking/earlier context or acquired counts exist
 * here. skyExposure verifies the separate native frame and zero-source branch;
 * reduced navigation tiles never substitute for this API. Its fresh history
 * is an explicit supported input domain, not a runtime history detector. */
type Snapshot=Readonly<{area:NativeCatalogRegion;regionIds:readonly number[];bandOrder:readonly string[];absenceCertificates:readonly {allPositionMatches:readonly number[];recordsChecked:number}[];bands:readonly {name:string;recordCount:number;reads:readonly {index:number;rawHex:string}[]}[];expectedFinalIds:readonly string[];sources:readonly {path:string;sha256:string;bytes:number}[]}>;
function buildKnownPopulation(domain:unknown,expected:typeof PINNED_FIELD_DOMAIN,snapshot:Snapshot):PinnedNativePopulation {
  if(!sameDomain(domain,expected))throw new NativeFieldError('unsupported-domain');
  // dec0 makes the area independent of unvalidated nonzero-angle cosine.
  const halfDec=(3*15)/120,halfRa=halfDec/(Math.cos(expected.pointing.dec*Math.PI/180)*15);
  const area=Object.freeze({minimumRa:expected.pointing.ra-halfRa,maximumRa:expected.pointing.ra+halfRa,minimumDec:expected.pointing.dec-halfDec,maximumDec:expected.pointing.dec+halfDec,limitingMagnitude:Math.fround(20)});
  if(!sameDomain(area,snapshot.area))throw new NativeFieldError('evidence');
  const ids=nativeRegionIds(area),order=nativeCompactBandOrder(ids);
  if(ids.join(',')!==snapshot.regionIds.join(',')||order.join(',')!==snapshot.bandOrder.join(','))throw new NativeFieldError('evidence');
  if(snapshot.absenceCertificates.length!==4||snapshot.absenceCertificates.some(c=>c.allPositionMatches.length!==0||c.recordsChecked<=0))throw new NativeFieldError('evidence');
  const stars:NativeFieldStar[]=[];
  for(const band of order){
    const source=snapshot.bands.find(b=>b.name===band);if(!source)throw new NativeFieldError('evidence');
    const rows=new Map(source.reads.map(r=>[r.index,decodeNativeCompactRecord(r.rawHex,band,r.index)]));
    const trace=traceCompactGscBandRead({recordCount:source.recordCount,readPackedRa(index){const row=rows.get(index);if(!row)throw new NativeFieldError('evidence');return new DataView(Uint8Array.from(row.rawHex.match(/../g)!,x=>parseInt(x,16)).buffer).getInt32(0,true);}},Math.round(area.minimumRa*10_000_000),area.maximumRa,10_000);
    for(const visit of trace.visits){const r=rows.get(visit.recordIndex)!;if(nativeCatalogAdmission(r,area))stars.push(r);}
  }
  if(stars.map(r=>r.id).join(',')!==snapshot.expectedFinalIds.join(','))throw new NativeFieldError('evidence');
  return Object.freeze({[fieldBrand]:true as const,scope:'pinned-original-population',domain:expected,area,regionIds:ids,bandOrder:order,stars:Object.freeze(stars),galaxies:Object.freeze([]) as readonly never[],sources:Object.freeze(snapshot.sources.map(s=>Object.freeze({...s})))});
}

export function buildPinnedNativePopulation(domain:unknown):PinnedNativePopulation {return buildKnownPopulation(domain,PINNED_FIELD_DOMAIN,snapshot);}
export function buildPinnedStarPopulation(domain:unknown):PinnedNativePopulation {return buildKnownPopulation(domain,PINNED_STAR_DOMAIN,starSnapshot);}

/** Same128-star population proven independently from whole sources and the telescope-independent field/area branch; only the explicit record1 domain is admitted. */
export function buildPinnedKpno09StarPopulation(domain:unknown):PinnedNativePopulation{return buildKnownPopulation(domain,PINNED_KPNO09_STAR_DOMAIN,starSnapshot);}

/** Independently reconstructed record2 domain; original pinned data bytes stay unchanged. */
export function buildPinnedMayallStarPopulation(domain:unknown):PinnedNativePopulation{return buildKnownPopulation(domain,PINNED_MAYALL_STAR_DOMAIN,starSnapshot);}

export const PINNED_KPNO09_SKY_DOMAIN=Object.freeze({...skyProfiles.profiles[1].domain,pointing:Object.freeze({...skyProfiles.profiles[1].domain.pointing})});
export const PINNED_MAYALL_SKY_DOMAIN=Object.freeze({...skyProfiles.profiles[2].domain,pointing:Object.freeze({...skyProfiles.profiles[2].domain.pointing})});
/** Same complete original cache field, independently checked for selected optical records1/2. */
export function buildPinnedSkyProfilePopulation(index:0|1|2):PinnedNativePopulation{if(index===0)return buildPinnedNativePopulation(PINNED_FIELD_DOMAIN);if(index===1)return buildKnownPopulation(PINNED_KPNO09_SKY_DOMAIN,PINNED_KPNO09_SKY_DOMAIN,snapshot);if(index===2)return buildKnownPopulation(PINNED_MAYALL_SKY_DOMAIN,PINNED_MAYALL_SKY_DOMAIN,snapshot);throw new NativeFieldError('unsupported-domain');}
