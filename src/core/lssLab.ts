/** E02 Large-Scale Structure student guide: progress recomputed from the current survey state on every render. No stored
 * checkmarks; "done" means the student did the step (a list loaded, a record made, records plotted, a description written,
 * the investigation saved), never that a redshift is correct. Pure: no React, i18n, clock or I/O. */
export const LSS_LAB_STEPS=['load','observe','record','repeat','wedge','describe','save'] as const;
export type LssLabStep=(typeof LSS_LAB_STEPS)[number];
/** What the survey reports. `records` are the student's own Record Z rows, `galaxies` the distinct galaxies they measure, `fields` the distinct fields. */
export type LssLabSummary=Readonly<{listLoaded:boolean;observed:boolean;records:number;galaxies:number;fields:number;plotted:number;described:boolean;saved:boolean}>;
export const INITIAL_LSS_LAB_SUMMARY:LssLabSummary=Object.freeze({listLoaded:false,observed:false,records:0,galaxies:0,fields:0,plotted:0,described:false,saved:false});
export type LssLabProgress=Readonly<{done:Readonly<Record<LssLabStep,boolean>>;summary:LssLabSummary}>;
/** "repeat" asks for several DIFFERENT galaxies (distinct selected catalogue galaxies, not repeated Record Z on one) (a wedge needs more than a handful of points); 5 is a guide threshold
 * chosen here, not an original requirement. */
export const LSS_LAB_REPEAT_RECORDS=5;
export function lssLabProgress(s:LssLabSummary):LssLabProgress{
 const done={load:s.listLoaded||s.records>0,observe:s.observed||s.records>0,record:s.records>0,repeat:s.galaxies>=LSS_LAB_REPEAT_RECORDS,wedge:s.plotted>0,describe:s.described,save:s.saved};
 return Object.freeze({done:Object.freeze(done),summary:s});
}
export const sameLssLabSummary=(a:LssLabSummary,b:LssLabSummary)=>(Object.keys(a) as (keyof LssLabSummary)[]).every(k=>a[k]===b[k]);
