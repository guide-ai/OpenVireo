import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import proof from '../../data/hubble/mayall-provenance.json';
import sv from '../../data/hubble/mayall-star-vectors.json';
import g1 from '../../data/hubble/mayall-galaxy-36747-vectors.json';
import g2 from '../../data/hubble/mayall-galaxy-36773-vectors.json';
import g3 from '../../data/hubble/mayall-galaxy-54876-vectors.json';
import {MAYALL_PROOF_SHA256} from './starTelescope';
import {verifiedStarConfiguration,createStarExposure,activateStar,startStar,tickStar,deactivateStar} from './starExposure';
import {verifiedGalaxyConfiguration,createGalaxyExposure,activateGalaxy,startGalaxy,tickGalaxy,deactivateGalaxy} from './galaxyExposure';
import {serializeStarSession,parseStarSession} from '../io/starSession';
import {serializeGalaxySession,parseGalaxySession} from '../io/galaxySession';
const hash=(x:Uint8Array|Uint8ClampedArray)=>createHash('sha256').update(x).digest('hex');
describe('Mayall record2 original calibration/raster and both Poisson branches',()=>{
 it('pins the immutable native/source/reference packet and all20 independent scalar trajectories',()=>{expect(hash(readFileSync(new URL('../../data/hubble/mayall-provenance.json',import.meta.url)))).toBe(MAYALL_PROOF_SHA256);for(const[file,digest]of [['star',proof.star.vectorsSHA256],...proof.galaxies.map(r=>['galaxy-'+r.id,r.vectorsSHA256])])expect(hash(readFileSync(new URL(`../../data/hubble/mayall-${file}-vectors.json`,import.meta.url)))).toBe(digest);expect(proof.calibration.storedZeroPoint).toBe(9);});
 it('reconstructs the complete star frame, centered binary slit and independently computed calibrated means',()=>{const c=verifiedStarConfiguration(2);expect(c.zeroPoint).toBe(9);expect(c.pixelLevel).toBe(sv.raster.slitLevel);expect(c.fraction).toBe(1);expect(hash(c.viewport.rgb)).toBe(sv.raster.cropSHA256);expect(c.field.stars).toHaveLength(128);expect(c.field.domain.telescopeRecord).toBe(2);for(const v of sv.sourceChecks)expect(Math.abs(c.sourceMeans[v.bin]-Number(v.meanDecimal))).toBeLessThan(1e-14);expect(Math.max(...c.sourceMeans)*50000).toBeLessThan(1_000_000);});
 for(const v of sv.vectors)it(`star matches all600 Decimal100 product/rejection counts and seed ${v.seed}/${v.deltas}`,()=>{let s=startStar(activateStar(createStarExposure(v.seed,2)));for(const d of v.deltas)s=tickStar(s,d);expect(s.exposure.counts).toEqual(v.counts);expect(s.exposure.sourceTotal).toBe(v.sourceTotal);expect(s.exposure.skyTotal).toBe(v.skyTotal);expect(s.exposure.seed).toBe(v.finalSeed);expect(s.exposure.draws).toBe(v.draws);if(v.deltas.some(d=>d>0))expect(v.largeCalls).toBeGreaterThan(0);});
 for(const[id,fixture]of [['36747',g1],['36773',g2],['54876',g3]]as const){
  it(`${id} independently repaints the complete galaxy/star field and calibrates its own slit`,()=>{const c=verifiedGalaxyConfiguration(id,2);expect(c.zeroPoint).toBe(9);expect(c.pixelLevel).toBe(fixture.raster.slitLevel);expect(c.fraction).toBe(fixture.raster.fraction);expect(hash(c.viewport.rgb)).toBe(fixture.raster.cropSHA256);expect(c.field.domain.telescopeRecord).toBe(2);for(const v of fixture.sourceChecks)expect(Math.abs(c.sourceMeans[v.bin]-Number(v.meanDecimal))).toBeLessThan(1e-14);});
  for(const v of fixture.vectors)it(`${id} matches all600 independent bins, source/sky and RNG ${v.seed}/${v.deltas}`,()=>{let s=startGalaxy(activateGalaxy(createGalaxyExposure(v.seed,id,2)));for(const d of v.deltas)s=tickGalaxy(s,d);expect(s.exposure.counts).toEqual(v.counts);expect(s.exposure.sourceTotal).toBe(v.sourceTotal);expect(s.exposure.skyTotal).toBe(v.skyTotal);expect(s.exposure.seed).toBe(v.finalSeed);expect(s.exposure.draws).toBe(v.draws);});
 }
 it('rolls back the whole tick at the known unresolved singular midpoint, without consuming seed or partial photons',()=>{const s=startStar(activateStar(createStarExposure(2796574515,2))),before=JSON.stringify(s);expect(s.exposure.sourceMeans![0]*50000).toBeGreaterThan(12);expect(()=>tickStar(s,1000)).toThrow(expect.objectContaining({code:'precision'}));expect(JSON.stringify(s)).toBe(before);expect(()=>tickStar(s,1001)).toThrow();});
 it('uses strict profile-bound v3 journals without relaxing old v1/v2 proofs or allowing cached counts',()=>{const star=deactivateStar(tickStar(startStar(activateStar(createStarExposure(1,2))),100)),gal=deactivateGalaxy(tickGalaxy(startGalaxy(activateGalaxy(createGalaxyExposure(1,'36773',2))),100));for(const[s,write,read]of [[star,serializeStarSession,parseStarSession],[gal,serializeGalaxySession,parseGalaxySession]]as const){const text=write(s),v=JSON.parse(text);expect(v.version).toBe(3);expect(v.telescopeIndex).toBe(2);expect(write(read(v))).toBe(text);for(const change of [(v:any)=>v.version=2,(v:any)=>v.configurationSHA256='bad',(v:any)=>v.telescopeIndex=1,(v:any)=>v.domain.telescopeRecord=0,(v:any)=>v.counts=[1]]){const bad=structuredClone(v);change(bad);expect(()=>read(bad)).toThrow();}}});
});
