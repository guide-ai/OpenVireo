import { CATALOG_MAXIMUM_RA } from './catalogMerge';
import { roundNearestEven } from './numericPolicy';
import { hourDifference, type Pointing } from './sky';

export class ObjectSelectionError extends Error {
  constructor(readonly code: 'point' | 'scene' | 'scale' | 'throughput' | 'overflow') {
    super(`Catalog object selection: ${code}`); this.name = 'ObjectSelectionError';
  }
}
export type ProjectedCatalogObject = Readonly<{ id: string; x: number; y: number }>;
export type ProjectedGalaxy = ProjectedCatalogObject & Readonly<{ majorArcminutes: number }>;
export type CatalogCandidate<T> = Readonly<{ object: T; distance: number; index: number }>;
export type ObjectSelection = Readonly<
  { kind: 'none'; star: CatalogCandidate<ProjectedCatalogObject> | null; galaxy: CatalogCandidate<ProjectedGalaxy> | null; galaxyRadius: number } |
  { kind: 'star'; object: ProjectedCatalogObject; star: CatalogCandidate<ProjectedCatalogObject>; galaxy: CatalogCandidate<ProjectedGalaxy> | null; galaxyRadius: number } |
  { kind: 'galaxy'; object: ProjectedGalaxy; star: CatalogCandidate<ProjectedCatalogObject> | null; galaxy: CatalogCandidate<ProjectedGalaxy>; galaxyRadius: number } |
  { kind: 'throughput-required'; star: CatalogCandidate<ProjectedCatalogObject>; galaxy: CatalogCandidate<ProjectedGalaxy>; galaxyRadius: number }
>;
const nativeSceneBrand: unique symbol = Symbol('native-selection-scene');
export type NativeSelectionFrame = Readonly<{ width: number; height: number; fieldDegrees: number; center: Pointing; population: Readonly<{ coverage: 'complete' | 'limited' | 'unknown'; provenance: string }> }>;
export type NativeSelectionScene = Readonly<{ [nativeSceneBrand]: true; stars: readonly ProjectedCatalogObject[]; galaxies: readonly ProjectedGalaxy[]; verticalPixelsPerDegree: number; frame: NativeSelectionFrame }>;
type CatalogSkyPosition = Pointing & Readonly<{ id: string }>;
/** Explicit native-frame projection (0x5949c8/0x594a44/0x594b04), no display
 * size default. This constructor requires a caller's complete-field population
 * attestation and provenance; it does not prove catalog completeness itself.
 * Limited/unknown previews are rejected. Sky coordinates are projected here,
 * so SVG x/y objects cannot structurally substitute for a NativeSelectionScene.
 * Number/Math and bounded scene validation remain explicit browser policies.
 */
export function createNativeSelectionScene(stars: readonly CatalogSkyPosition[], galaxies: readonly (CatalogSkyPosition & Readonly<{majorArcminutes:number}>)[], frame: NativeSelectionFrame): NativeSelectionScene {
  if (!frame || !frame.population || frame.population.coverage !== 'complete' || typeof frame.population.provenance !== 'string' || !frame.population.provenance.trim() || frame.population.provenance.length > 1000) throw new ObjectSelectionError('scene');
  const {width,height,fieldDegrees,center}=frame;
  if (![width,height].every(value=>Number.isInteger(value)&&value>0&&value<=0x7fffffff) || !Number.isFinite(fieldDegrees) || fieldDegrees<=0) throw new ObjectSelectionError('scale');
  if (!center || !Number.isFinite(center.ra) || center.ra<0 || center.ra>=24 || !Number.isFinite(center.dec) || Math.abs(center.dec)>90) throw new ObjectSelectionError('scene');
  const verticalPixelsPerDegree=height/fieldDegrees;
  if (!Number.isFinite(verticalPixelsPerDegree) || verticalPixelsPerDegree<=0 || !Number.isFinite(width*15/fieldDegrees)) throw new ObjectSelectionError('overflow');
  if (stars.length>200000 || galaxies.length>200000) throw new ObjectSelectionError('scene');
  function position(row: CatalogSkyPosition): ProjectedCatalogObject {
    if (!row || typeof row.id!=='string' || !row.id || row.id.length>200 || !Number.isFinite(row.ra) || row.ra<0 || row.ra>CATALOG_MAXIMUM_RA || !Number.isFinite(row.dec) || Math.abs(row.dec)>90) throw new ObjectSelectionError('scene');
    const x=width/2+hourDifference(center.ra,row.ra)*Math.cos(row.dec*Math.PI/180)*width*15/fieldDegrees;
    const y=height/2+(center.dec-row.dec)*height/fieldDegrees;
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new ObjectSelectionError('overflow');
    return Object.freeze({id:row.id,x,y});
  }
  const projectedStars=Array.from(stars,position);
  const projectedGalaxies=Array.from(galaxies,row=>{
    const point=position(row),major=Math.fround(row.majorArcminutes);
    if (!Number.isFinite(major)||major<0) throw new ObjectSelectionError('scene');
    return Object.freeze({...point,majorArcminutes:major});
  });
  const storedFrame=Object.freeze({...frame,center:Object.freeze({...center}),population:Object.freeze({...frame.population})});
  return Object.freeze({[nativeSceneBrand]:true as const,stars:Object.freeze(projectedStars),galaxies:Object.freeze(projectedGalaxies),verticalPixelsPerDegree,frame:storedFrame});
}

/** 0x599f1c/0x59a010: strict nearest distance below the initial350-pixel
 * sentinel; equal distances preserve collection order. Native coordinates are
 * supplied Double scene values, not display coordinates or target tolerances.
 * This adapter requires a bounded dense scene and returns copied/frozen data.
 */
export function nearestCatalogObject<T extends ProjectedCatalogObject>(objects: readonly T[], x: number, y: number): CatalogCandidate<T> | null {
  if (!Number.isInteger(x) || x < -0x80000000 || x > 0x7fffffff || !Number.isInteger(y) || y < -0x80000000 || y > 0x7fffffff) throw new ObjectSelectionError('point');
  if (objects.length > 200_000) throw new ObjectSelectionError('scene');
  let nearest: CatalogCandidate<T> | null = null, minimum = 350;
  for (let index = 0; index < objects.length; index++) {
    const object = objects[index];
    if (!object || typeof object.id !== 'string' || !object.id || object.id.length > 200 || !Number.isFinite(object.x) || !Number.isFinite(object.y)) throw new ObjectSelectionError('scene');
    const dx = x - object.x, dy = y - object.y;
    // Preserve the recovered square/add/sqrt operations, not Math.hypot's
    // distinct scaling/rounding. Overflow is a new explicit adapter guard.
    const squared = dx * dx + dy * dy, distance = Math.sqrt(squared);
    if (!Number.isFinite(distance)) throw new ObjectSelectionError('overflow');
    if (distance < minimum) {
      minimum = distance;
      nearest = Object.freeze({ object: Object.freeze({ ...object }) as T, distance, index });
    }
  }
  return nearest;
}
/** 0x59a13b–0x59a19c. Zero Single major diameter becomes Extended0.5;
 * radius=max(3,round(major * (verticalPixelsPerDegree/60) /2)). Nearest-even is the
 * declared browser policy; the original current x87 control word is unmeasured.
 */
export function galaxySelectionRadius(majorArcminutes: number, verticalPixelsPerDegree: number): number {
  const major = Math.fround(majorArcminutes);
  if (!Number.isFinite(major) || major < 0) throw new ObjectSelectionError('scene');
  if (!Number.isFinite(verticalPixelsPerDegree) || verticalPixelsPerDegree <= 0) throw new ObjectSelectionError('scale');
  const radius = roundNearestEven(((major === 0 ? .5 : major) * (verticalPixelsPerDegree / 60)) / 2);
  if (!Number.isSafeInteger(radius) || radius > 0x7fffffff) throw new ObjectSelectionError('overflow');
  return Math.max(3, radius);
}
/** 0x59a0fc–0x59a2d1. In overlapping candidates with starDistance<=galaxyDistance
 * and galaxyDistance<radius, the original calls star then galaxy throughput,
 * and chooses the galaxy iff the STAR throughput is zero. Until the scene's
 * real slit/photometer throughput is supplied, return an explicit unresolved
 * result. Do not turn the preview sky or a missing value into a fake selection.
 * No star aperture cutoff is inserted here: later throughput can select sky.
 */
export function selectCatalogObject(scene: NativeSelectionScene, x: number, y: number, starThroughput?: number): ObjectSelection {
  if (!scene || scene[nativeSceneBrand] !== true) throw new ObjectSelectionError('scene');
  const {stars,galaxies,verticalPixelsPerDegree}=scene;
  if (!Number.isFinite(verticalPixelsPerDegree) || verticalPixelsPerDegree <= 0) throw new ObjectSelectionError('scale');
  if (starThroughput !== undefined && (!Number.isFinite(starThroughput) || starThroughput < 0)) throw new ObjectSelectionError('throughput');
  if (galaxies.length > 200_000) throw new ObjectSelectionError('scene');
  // Validate every galaxy's Single diameter, including nonwinning candidates.
  for (let i = 0; i < galaxies.length; i++) {
    const galaxy = galaxies[i];
    if (!galaxy || !Number.isFinite(Math.fround(galaxy.majorArcminutes)) || Math.fround(galaxy.majorArcminutes) < 0) throw new ObjectSelectionError('scene');
  }
  const star = nearestCatalogObject(stars, x, y), galaxy = nearestCatalogObject(galaxies, x, y);
  const radius = galaxy ? galaxySelectionRadius(galaxy.object.majorArcminutes, verticalPixelsPerDegree) : 0;
  const common = { star, galaxy, galaxyRadius: radius };
  if (!galaxy) return Object.freeze(star ? { ...common, kind: 'star' as const, object: star.object, star } : { ...common, kind: 'none' as const });
  if (galaxy.distance < (star?.distance ?? 350)) {
    return Object.freeze(galaxy.distance < radius ? { ...common, kind: 'galaxy' as const, object: galaxy.object, galaxy } : { ...common, kind: 'none' as const });
  }
  if (galaxy.distance >= radius) return Object.freeze(star ? { ...common, kind: 'star' as const, object: star.object, star } : { ...common, kind: 'none' as const });
  // This branch necessarily has a star: an admitted galaxy is closer than350.
  if (starThroughput === undefined) return Object.freeze({ ...common, kind: 'throughput-required' as const, star: star!, galaxy });
  return Object.freeze(starThroughput === 0 ? { ...common, kind: 'galaxy' as const, object: galaxy.object, galaxy } : { ...common, kind: 'star' as const, object: star!.object, star: star! });
}
