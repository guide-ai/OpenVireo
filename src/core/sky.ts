import {diagnosticError} from './diagnostics';

export type Pointing = Readonly<{ ra: number; dec: number }>;
export type SkyObject = Pointing & Readonly<{ id: string; label: string; sourceLine?: number; hotList?: string; image: string | null; spectrum: { url: string; name: string; sha256: string } | null }>;
export type CatalogStar = Pointing & Readonly<{ magnitude: number }>;
export const FIELDS = { finder: 2.5, telescope: 0.25 } as const;
export type FieldMode = keyof typeof FIELDS;
export function validatePointing(ra: number, dec: number): Pointing {
  if (!Number.isFinite(ra) || !Number.isFinite(dec) || ra < 0 || ra >= 24 || Math.abs(dec) > 90) throw diagnosticError('sky.invalidCoordinates');
  return { ra, dec };
}
export function wrapHours(ra: number): number { return ((ra % 24) + 24) % 24; }
export function hourDifference(center: number, object: number): number {
  const delta = center - object;
  return delta < -12 ? delta + 24 : delta > 12 ? delta - 24 : delta;
}
/** Recovered 0x5949c8, 0x594a44 and 0x594b04. Original Extended
 * arithmetic is adapted to Number; original pixel rounding is not reproduced.
 * The cosine is of the OBJECT declination, confirmed by caller 0x53ca7c. */
export function project(object: Pointing, center: Pointing, field: number, size = 700): { x: number; y: number; visible: boolean } {
  const x = size / 2 + hourDifference(center.ra, object.ra) * Math.cos(object.dec * Math.PI / 180) * size * 15 / field;
  const y = size / 2 + (center.dec - object.dec) * size / field;
  return { x, y, visible: x >= 0 && x <= size && y >= 0 && y <= size };
}
/** New discrete browsing action. The original timer and motor rates are not
 * emulated. Pole reflection and 12h RA change follow 0x538e4c. */
export function pan(center: Pointing, direction: 'north' | 'east' | 'south' | 'west', field: number): Pointing {
  let { ra, dec } = center;
  const step = field / 4;
  if (direction === 'north' || direction === 'south') dec += direction === 'north' ? step : -step;
  else ra += (direction === 'east' ? 1 : -1) * step / (15 * Math.max(0.01, Math.cos(dec * Math.PI / 180)));
  if (dec > 90 || dec < -90) { dec = (dec > 0 ? 180 : -180) - dec; ra += 12; }
  return { ra: wrapHours(ra), dec };
}
/** All tiles that can project inside the square, including wrap and poles. */
export function requiredTiles(center: Pointing, field: number): readonly number[] {
  const maxDec = Math.min(90, Math.abs(center.dec) + field / 2);
  const extent = maxDec === 90 ? 12 : Math.min(12, field / (30 * Math.cos(maxDec * Math.PI / 180)));
  if (extent >= 12) return Array.from({ length: 24 }, (_, i) => i);
  const result = new Set<number>();
  for (let h = Math.floor(center.ra - extent); h <= Math.floor(center.ra + extent); h++) result.add((h + 24) % 24);
  return [...result].sort((a, b) => a - b);
}
/** 0x59b055–0x59b081: FILD int32 -> Extended / float constant -> double.
 * Magnitude divides an int16 and stores float32; no intermediate float32
 * coordinate rounding exists, despite the decompiler cast. Number is an adaptation.
 * Packed input remains in source units so this conversion is reviewable. */
export function decodeGsc(rows: unknown): readonly CatalogStar[] {
  if (!Array.isArray(rows) || rows.length > 200_000) throw diagnosticError('sky.invalidCatalog');
  return rows.map((row: unknown) => {
    if (!Array.isArray(row) || row.length !== 3 || !row.every(Number.isInteger) || row[0] < 0 || row[0] > 240_000_000 || Math.abs(row[1]) > 9_000_000 || row[2] < -3000 || row[2] > 12000) throw diagnosticError('sky.invalidCatalog');
    return { ra: row[0] / 1e7, dec: row[1] / 1e5, magnitude: Math.fround(row[2] / 1000) };
  });
}

/** New half-display-pixel target-centering tolerance, not a recovered slit
 * aperture. Avoid disabling a target due only to decimal display round trips. */
export function targetCentered(object: Pointing, center: Pointing, field: number): boolean {
  const point = project(object, center, field);
  return Math.hypot(point.x - 350, point.y - 350) <= .5;
}
/** RA-hour x 5-degree declination tiles avoid full-sky polar downloads. */
export function requiredSkyTiles(center: Pointing, field: number): readonly string[] {
  const low = Math.max(0, Math.floor((Math.max(-90, center.dec - field / 2) + 90) / 5));
  const high = Math.min(35, Math.floor((Math.min(90, center.dec + field / 2) + 90) / 5));
  return requiredTiles(center, field).flatMap(hour => Array.from({length: high - low + 1}, (_, i) => `${hour.toString().padStart(2,'0')}/${(low+i).toString().padStart(2,'0')}`));
}
