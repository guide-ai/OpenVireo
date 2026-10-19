import {describe,it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import snapshot from '../../data/hubble/pinned-hubble-field.json';
import provenance from '../../data/hubble/pinned-hubble-field-provenance.json';
import {buildPinnedNativePopulation,decodeNativeCompactRecord,nativeCompactBandOrder,nativeNonwrappedRegionOverlap,nativeRegionIds,PINNED_FIELD_DOMAIN,NativeFieldError} from './pinnedNativeField';
import {nativeObjectSlitFraction} from './slitThroughput';
import {traceCompactGscBandRead} from './compactGscReadOrder';
const hash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
describe('one complete original fresh-Hubble fallback population; not the navigation subset',()=>{
  it('binds trusted bundled replay inputs to independently generated source snapshots',()=>{
    expect(hash(readFileSync(new URL('../../data/hubble/pinned-hubble-field.json',import.meta.url)))).toBe(provenance.snapshotSHA256);
    expect(hash(readFileSync(new URL('../../data/hubble/native-regions.json',import.meta.url)))).toBe(provenance.regionSnapshotSHA256);
    expect(provenance.sources).toHaveLength(9);expect(provenance.targetSHA256).toBe('781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c');
    expect(snapshot.absenceCertificates.map(c=>[c.recordsChecked,c.allPositionMatches.length])).toEqual([[31147,0],[2269,0],[24069,0],[183,0]]);
  });
  it('derives the exact equatorial area, original regions and north-then-south order',()=>{
    const p=buildPinnedNativePopulation(PINNED_FIELD_DOMAIN);
    expect(p.area).toEqual({minimumRa:19/40,maximumRa:21/40,minimumDec:-3/8,maximumDec:3/8,limitingMagnitude:20});
    expect(p.regionIds).toEqual([3,10,4665,4672]);expect(p.bandOrder).toEqual(['N0000','S0000']);
    expect(p.stars).toHaveLength(132);expect(p.galaxies).toEqual([]);
    expect(p.stars.filter(r=>r.band==='N0000')).toHaveLength(61);expect(p.stars.filter(r=>r.band==='S0000')).toHaveLength(71);
    expect(p.stars.map(r=>r.id)).toEqual(snapshot.expectedFinalIds);expect(p.stars.every(r=>r.type===0)).toBe(true);
    expect(p.stars.filter(r=>r.magnitude>12).length).toBeGreaterThan(100);
    // Native append-after-current does not globally re-sort by RA between bands.
    expect(p.stars[61].ra).toBeLessThan(p.stars[60].ra);
  });
  it('replays all original probes and scans, including the first record beyond the maximum',()=>{
    for(const band of snapshot.bands){
      const records=new Map(band.reads.map(r=>[r.index,Buffer.from(r.rawHex,'hex')]));
      const result=traceCompactGscBandRead({recordCount:band.recordCount,readPackedRa(index){const raw=records.get(index);if(!raw)throw Error(`Unexpected original read${index}`);return raw.readInt32LE(0);}},band.key,snapshot.area.maximumRa,10000);
      expect(result.probes).toEqual(band.expectedProbes);expect(result.visits).toHaveLength(band.visits);
      expect(result.visits[0].recordIndex).toBe(band.firstVisit);expect(result.visits.at(-1)!.recordIndex).toBe(band.lastVisit);
      expect(hash(Buffer.concat(result.visits.map(v=>records.get(v.recordIndex)!)))).toBe(band.visitedRawSHA256);
      expect(result.stopReason).toBe('past-upper-ra');expect(result.visits.at(-1)!.packedRa/1e7).toBeGreaterThan(snapshot.area.maximumRa);
    }
  });
  it('retains every admitted original byte/identity and owns the repeated immutable output',()=>{
    const p=buildPinnedNativePopulation(PINNED_FIELD_DOMAIN),again=buildPinnedNativePopulation(structuredClone(PINNED_FIELD_DOMAIN));
    expect(again).toEqual(p);expect(again.stars).not.toBe(p.stars);expect(Object.isFrozen(p.stars[0])).toBe(true);expect(Object.isFrozen(p.stars)).toBe(true);expect(Object.isFrozen(p.domain.pointing)).toBe(true);
    for(const r of p.stars){const raw=snapshot.bands.find(b=>b.name===r.band)!.reads.find(x=>x.index===r.recordIndex)!.rawHex;expect(r.rawHex).toBe(raw);const bytes=Buffer.from(raw,'hex');expect(r.ra).toBe(bytes.readInt32LE(0)/1e7);expect(r.dec).toBe(bytes.readInt32LE(4)/1e5);expect(r.magnitude).toBe(Math.fround(bytes.readInt16LE(12)/1000));expect(r.qualityByte).toBe(bytes[20]);}
  });
  it('rejects unproved options, lifecycle, pointing, catalog or telescope configuration instead of guessing',()=>{
    const changes=[{pointing:{ra:.500001,dec:0}},{pointing:{ra:.5,dec:1}},{pointing:{ra:.5,dec:90}},{history:'prior-general-session'},{dynamicContext:'unknown'},{dynamicContext:'present'},{fieldArcminutes:3},{fieldMultiplier:1},{exercise:'general'},{exerciseMode:0},{catalogMode:0},{telescopeRecord:1},{options:'existing-option-file'},{extra:true}];
    for(const change of changes)expect(()=>buildPinnedNativePopulation({...PINNED_FIELD_DOMAIN,...change})).toThrow(expect.objectContaining({code:'unsupported-domain'}));
    for(const value of [null,undefined,[],{}])expect(()=>buildPinnedNativePopulation(value)).toThrow(NativeFieldError);
  });
  it('preserves strict overlap and exact band upper-limit boundaries',()=>{
    const a={minimumRa:1,maximumRa:2,minimumDec:-1,maximumDec:1};
    expect(nativeNonwrappedRegionOverlap(a,{minimumRa:2,maximumRa:3,minimumDec:-1,maximumDec:1})).toBe(false);
    expect(nativeNonwrappedRegionOverlap(a,{minimumRa:1,maximumRa:2,minimumDec:1,maximumDec:2})).toBe(false);
    expect(nativeNonwrappedRegionOverlap(a,{minimumRa:1.5,maximumRa:3,minimumDec:0,maximumDec:2})).toBe(true);
    expect(nativeCompactBandOrder([594,593,4663,4662,9537,593])).toEqual(['N0000','N0730','N8230','S0000','S8230']);
    expect(()=>nativeRegionIds({...a,minimumRa:2,maximumRa:1})).toThrow();expect(()=>nativeRegionIds({...a,minimumRa:1,maximumRa:1})).toThrow();
    for(const ids of [[0],[9538],[1.5],Array(101).fill(1)])expect(()=>nativeCompactBandOrder(ids)).toThrow(NativeFieldError);
  });
  it('establishes a potential sky-only route independently of the unknown pixel value, without supplying pixels to production',()=>{
    const p=buildPinnedNativePopulation(PINNED_FIELD_DOMAIN);
    for(const star of p.stars){
      expect(Math.abs(star.ra-.5)>=.00028||Math.abs(star.dec)>=.0064).toBe(true);
      // Finite exhaustive diagnostic levels, not a fabricated detector frame.
      // The original stellar branch rejects the raw angular cuts before its
      // pixel positivity affects the result. No count/mean is created here.
      for(let level=0;level<=765;level++)expect(nativeObjectSlitFraction({objectPresent:true,objectType:0,pixelLevel:level,object:{raHours:star.ra,decDegrees:star.dec},pointing:{raHours:.5,decDegrees:0}})).toBe(0);
    }
  });
  it('decodes full source ranges and rejects malformed compact data without preview clipping',()=>{
    const raw=Buffer.alloc(27);raw.writeInt32LE(5000000,0);raw.writeInt32LE(-37500,4);raw.writeInt16LE(19999,12);raw[20]=255;
    const r=decodeNativeCompactRecord(raw.toString('hex'),'S0000',0);expect(r.magnitude).toBe(Math.fround(19.999));expect(r.dec).toBe(-.375);expect(r.qualityByte).toBe(255);
    for(const input of ['',raw.toString('hex')+'00','g'.repeat(54)])expect(()=>decodeNativeCompactRecord(input,'N0000',0)).toThrow(NativeFieldError);
    expect(()=>decodeNativeCompactRecord(raw.toString('hex'),'preview',0)).toThrow();expect(()=>decodeNativeCompactRecord(raw.toString('hex'),'N0000',-1)).toThrow();
  });
});
