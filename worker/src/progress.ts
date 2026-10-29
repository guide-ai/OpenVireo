/** Pure: which exercises a saved investigation holds work for, and its format. No scientific results are derived in
 * version 1 (plan §5): that would duplicate the simulator's own pure readers, so results stay an explicit typed gap. */

export const DERIVER_VERSION = 'front-a-v1';
export const EXERCISES = ['E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'E08'] as const;
export type ExerciseId = typeof EXERCISES[number];

export const ANALYSIS_FORMAT = 'OpenVireo analysis session';
export const PRACTICE_FORMAT = 'OpenVireo stellar classification session';

export type InvestigationShape = Readonly<{ format: string; version: number; exercises: readonly ExerciseId[] }>;

const MAX_WRAPPER_DEPTH = 64;
const SECTION_EXERCISES: Readonly<Record<string, ExerciseId>> = {
  lss: 'E02', classification: 'E03', photometry: 'E04',
  clusterDatabase: 'E05', clusterComparison: 'E05', clusterSelection: 'E05', radio: 'E06', objectX: 'E08',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** Format sniffing only (Restore in the browser validates the whole file). Returns null for anything else. */
export function investigationShape(value: unknown): InvestigationShape | null {
  if (!isRecord(value) || typeof value.format !== 'string') return null;
  const version = value.version;
  if (typeof version !== 'number' || !Number.isSafeInteger(version) || version < 1 || version > 999) return null;
  const format = value.format.toLowerCase();
  if (format === PRACTICE_FORMAT.toLowerCase()) return { format: PRACTICE_FORMAT, version, exercises: ['E03'] };
  if (format !== ANALYSIS_FORMAT.toLowerCase()) return null;
  const found = new Set<ExerciseId>();
  let level: unknown = value;
  for (let depth = 0; isRecord(level) && depth < MAX_WRAPPER_DEPTH; depth++) {
    for (const [key, exercise] of Object.entries(SECTION_EXERCISES)) {
      if (level[key] !== undefined && level[key] !== null) found.add(exercise);
    }
    if (Array.isArray(level.measurements) && level.measurements.length > 0) found.add('E01');
    level = level.base;
  }
  return { format: ANALYSIS_FORMAT, version, exercises: EXERCISES.filter(e => found.has(e)) };
}

export type ProgressRow = Readonly<{
  exerciseId: ExerciseId; status: 'saved-work' | 'none'; investigationId: string | null;
  results: Readonly<{ derived: false; reason: 'results-not-derived-v1' }>;
}>;

/** Progress from the investigation index: per exercise, the newest investigation that holds its section. */
export function deriveProgress(index: readonly Readonly<{ id: string; createdAt: number; exercises: readonly string[] }>[]): ProgressRow[] {
  const newestFirst = [...index].sort((a, b) => b.createdAt - a.createdAt || (a.id < b.id ? 1 : -1));
  return EXERCISES.map(exerciseId => {
    const hit = newestFirst.find(i => i.exercises.includes(exerciseId));
    return { exerciseId, status: hit ? 'saved-work' : 'none', investigationId: hit?.id ?? null, results: { derived: false, reason: 'results-not-derived-v1' } };
  });
}
