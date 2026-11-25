/** Front NEWCOMER NC5 [W] (plan analysis/front-plans/front-newcomer.md §2.5; user decision of 2026-11-24): the two long labs,
 * Hubble's law and Pleiades photometry, each offer a quick version (any 3 different supported galaxies, any 8 admitted stars,
 * the visitor's choice) beside the full one, which is the original exercise. The quick version is a web suggestion, a part of the
 * original exercise; it opens by default (answer Q5). The choice is state of the tab, held by the shell like the guide in use:
 * it is never stored and never written to a file, so a reload or Restart exercise starts with the default again, while a Restore
 * keeps the tab's version (NC5 review N2, a departure from plan §2.5, which reset it).
 * Pure: no React, i18n, clock or I/O. */
import {GALAXY_TARGETS} from './galaxyIdentity';
import {HUBBLE_QUICK_GOAL} from './hubbleLab';
import {PLEIADES_QUICK_GOAL,PLEIADES_SAMPLE_TARGETS} from './pleiadesLab';

export type LabVersion='quick'|'full';
/** The labs that offer a quick version. */
export type VersionedLab='hubble'|'pleiades';
export type LabVersions=Readonly<Record<VersionedLab,LabVersion>>;
export const DEFAULT_LAB_VERSIONS:LabVersions=Object.freeze({hubble:'quick',pleiades:'quick'});
/** Distinct acquired galaxies the Hubble guide follows in a version (core/hubbleLab.ts `goal`). */
export const hubbleGoal=(version:LabVersion)=>version==='quick'?HUBBLE_QUICK_GOAL:GALAXY_TARGETS.length;
/** Admitted stars with a confirmed B−V the Pleiades sample step needs in a version (core/pleiadesLab.ts `goal`). */
export const pleiadesGoal=(version:LabVersion)=>version==='quick'?PLEIADES_QUICK_GOAL:PLEIADES_SAMPLE_TARGETS;
