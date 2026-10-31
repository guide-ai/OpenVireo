import {knownGalaxyTarget} from './galaxyIdentity';
import {diagnosticError,UNIDENTIFIED_OBJECT} from './diagnostics';
/** Scientific source contracts and numerical policy: docs/RECOVERY.md.
 * UI adaptation uses binary64. No original-x87 equivalence is claimed. */
export type Line = Readonly<{ wavelength: number; label: string }>;
export type Sample = Readonly<{ wavelength: number; intensity: number }>;
export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_SAMPLES = 50_000;
const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

function number(text: string, row: number): number {
  if (!decimal.test(text.trim())) throw diagnosticError('error.decimal', {line: row});
  const value = Number(text);
  if (!Number.isFinite(value)) throw diagnosticError('error.finite', {line: row});
  return value;
}

function nonEmptyRows(text: string): { text: string; line: number }[] {
  return text.replace(/^\uFEFF/, '').split(/\r?\n/)
    .map((row, i) => ({ text: row.trim(), line: i + 1 }))
    .filter(row => row.text.length > 0);
}

export function parseLines(text: string): readonly Line[] {
  return nonEmptyRows(text).map(({ text: row, line }) => {
    const match = /^\s*([^,]+),\s*'([^']{1,120})'\s*$/.exec(row);
    if (!match) throw diagnosticError('error.lineFormat', {line: line});
    const wavelength = number(match[1], line);
    if (wavelength <= 0) throw diagnosticError('error.positive', {line: line});
    return { wavelength, label: match[2] };
  });
}

/** Original GLXYTMPL.SP uses two whitespace-delimited decimal columns.
 * CSV with an optional wavelength,intensity header is a new browser adapter. */
function parseSamples(text: string, normalized: boolean): readonly Sample[] {
  if (new TextEncoder().encode(text).length > MAX_FILE_BYTES) throw diagnosticError('error.fileSize');
  const rows = nonEmptyRows(text);
  if (/^wavelength\s*,\s*intensity$/i.test(rows[0]?.text ?? '')) rows.shift();
  if (rows.length < 2 || rows.length > MAX_SAMPLES) throw diagnosticError('error.sampleCount');
  let previous = 0;
  return rows.map(({ text: row, line }) => {
    const fields = row.includes(',') ? row.split(',') : row.split(/\s+/);
    if (fields.length !== 2) throw diagnosticError('error.columns', {line: line});
    const wavelength = number(fields[0], line), intensity = number(fields[1], line);
    if (wavelength <= previous) throw diagnosticError('error.ordered', {line: line});
    if (normalized && (intensity < 0 || intensity > 1)) throw diagnosticError('error.normalized', {line: line});
    previous = wavelength;
    return { wavelength, intensity };
  });
}

/** User-import adapter requires pre-normalized 0–1 intensity. */
export function parseSpectrum(text: string): readonly Sample[] { return parseSamples(text, true); }
/** Original galaxy library SP files can exceed one (e.g. emission lines).
 * Preserve finite flux values exactly; any plot rescaling is presentation only. */
export function parseLibrarySpectrum(text: string): readonly Sample[] { return parseSamples(text, false); }

/** 0x58499c, 0x5849b9–0x5849c5: add one to Extended z, multiply
 * base wavelength double, store double. This adaptation computes in Number. */
export function shiftedWavelength(wavelength: number, z: number): number {
  if (!Number.isFinite(wavelength) || wavelength <= 0 || !Number.isFinite(z) || z <= -1) throw diagnosticError('error.domain');
  const value = wavelength * (1 + z);
  if (!Number.isFinite(value)) throw diagnosticError('error.overflow');
  return value;
}

export type ShiftControl = Readonly<{ base: number; position: number; factor: 1 | 10; step: number }>;
// step=0 means not configured in the new UI, not an original acquisition value.
export const INITIAL_CONTROL: ShiftControl = Object.freeze({ base: 0, position: 0, factor: 1, step: 0 });
/** 0x584424: input integer multiplication is signed low-32-bit IMUL. */
export function currentZ(s: ShiftControl): number {
  return s.base + s.step * Math.imul(s.position, s.factor);
}
/** 0x5844a8 rebases without setting measured z to zero. */
export function rebase(s: ShiftControl): ShiftControl { return { ...s, base: currentZ(s), position: 0 }; }
/** 0x5844e8 accumulates existing displacement BEFORE changing factor. */
export function changeFactor(s: ShiftControl, factor: 1 | 10): ShiftControl {
  // Repeated clicks on the already selected browser button are not change events.
  return factor === s.factor ? s : { ...rebase(s), factor };
}
/** New adapter: step is explicitly supplied by the analyst, never invented from an unavailable acquisition. */
export function configureStep(s: ShiftControl, step: number): ShiftControl {
  if (!Number.isFinite(step) || step <= 0 || step > 1) throw diagnosticError('error.step');
  return { ...rebase(s), step };
}
/** Browser control range is explicitly a UI choice, not recovered VCL Max. */
export function moveControl(s: ShiftControl, position: number): ShiftControl {
  if (!Number.isInteger(position) || position < -100 || position > 100) throw diagnosticError('error.position');
  const next = { ...s, position };
  if (!Number.isFinite(currentZ(next)) || currentZ(next) <= -1) throw diagnosticError('error.zPositive');
  return next;
}

export type MeasurementOrigin=Readonly<{kind:'catalog-star-acquisition';acquisitionId:string}|{kind:'catalog-galaxy-acquisition';acquisitionId:string;targetId?:string}>;
export type Measurement = Readonly<{ id: number; object: string; file: string; sha256: string; zNumber: number; zFloat32: number; zFloat32Hex: string; control: ShiftControl; reference: string; origin?:MeasurementOrigin;
  /** Front H2: the "Observational Data" record of a catalogue-galaxy measurement (typed velocity, remarks, Sp type, first time,
   * target position and V; core/hubbleObservation.ts), carried by session v32. Absent for every other row and for older files. */
  observation?:import('./hubbleObservation').HubbleObservation }>;
export function createMeasurement(id: number, object: string, file: string, sha256: string, control: ShiftControl, reference: string, origin?:MeasurementOrigin): Measurement {
  if(origin&&(!['catalog-star-acquisition','catalog-galaxy-acquisition'].includes(origin.kind)||!/^[a-f0-9]{64}$/.test(origin.acquisitionId)))throw diagnosticError('error.identity');
  if(origin&&Object.hasOwn(origin,'targetId')&&(origin.kind!=='catalog-galaxy-acquisition'||!knownGalaxyTarget(origin.targetId)))throw diagnosticError('error.identity');
  const z = currentZ(control);
  if (control.step <= 0 || !Number.isFinite(control.step)) throw diagnosticError('error.configure');
  if (Math.fround(z) <= -1) throw diagnosticError('error.storedDomain');
  if (!Number.isFinite(z) || z <= -1 || !Number.isFinite(Math.fround(z))) throw diagnosticError('error.representable');
  if (!Number.isSafeInteger(id) || id < 1 || !/^[a-f0-9]{64}$/.test(sha256)) throw diagnosticError('error.identity');
  // 0x5838b4/0x5838ba and 0x5839fb/0x583a01 store float32.
  // Number→float32 is an approximation to original Extended→float32.
  const bits = new DataView(new ArrayBuffer(4)); bits.setFloat32(0, z, false);
  return Object.freeze({ id, object: object.trim().slice(0, 80) || UNIDENTIFIED_OBJECT, file, sha256, zNumber: z, zFloat32: Math.fround(z), zFloat32Hex: bits.getUint32(0, false).toString(16).padStart(8, '0'), control: Object.freeze({ ...control }), reference,...(origin?{origin:Object.freeze({...origin})}:{}) });
}
function textCell(value: string): string {
  const safe = /^[\s]*[=+\-@]/.test(value) || /^[\t\r\n]/.test(value) ? "'" + value : value;
  return '"' + safe.replaceAll('"', '""') + '"';
}
export function measurementCsv(rows: readonly Measurement[]): string {
  const targets=rows.some(r=>r.origin?.kind==='catalog-galaxy-acquisition'&&r.origin.targetId!==undefined),traced=rows.some(r=>r.origin),header='schema,id,object,file,sha256,z_number,z_float32,z_float32_hex,analyst_step,base,position,factor,reference,numerical_policy'+(traced?',source_kind,acquisition_id':'')+(targets?',acquired_target_id':'');
  return header+'\r\n'+rows.map(r=>[targets?4:traced?3:2,r.id,textCell(r.object),textCell(r.file),r.sha256,r.zNumber.toString(),r.zFloat32.toString(),r.zFloat32Hex,r.control.step,r.control.base,r.control.position,r.control.factor,textCell(r.reference),'Number_x87_equivalence_unvalidated',...(traced?[r.origin?.kind??'imported-spectrum',r.origin?.acquisitionId??'']:[]),...(targets?[r.origin?.kind==='catalog-galaxy-acquisition'?r.origin.targetId??'36773':'']:[])].join(',')).join('\r\n')+'\r\n';
}
