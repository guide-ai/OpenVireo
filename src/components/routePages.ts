import {t} from '../i18n';
import {OBJECT_X_LAB} from '../objectx/ObjectXMessages';
import {VARIABLE_STARS} from '../variables/VariableStarMessages';
import {APP_SHELL_MESSAGES as SHELL} from './AppShellMessages';

/** The site's pages (each a `#route` of the address). Front HEADER: moved here from OpenVireo.tsx, so the sidebar's page groups
 * and the page bar's "section › page" read one table and cannot drift. */
export type Route='images'|'observatory'|'spectrum'|'spectrometer'|'sky-exposure'|'star-exposure'|'galaxy-exposure'|'classification'|'photometer'|'cluster-database'|'pulsar-analysis'|'radio-control'|'lss-wedge'|'lss-survey'|'object-x'|'variable-stars';
/** The sidebar sections that hold pages, in menu order (Results Editors and Exercise guides hold none: they open tools and guides). */
export type RouteGroup='optical'|'radio'|'analysis'|'files';
export const ROUTE_GROUPS:readonly RouteGroup[]=Object.freeze(['optical','radio','analysis','files']);
type RoutePage=Readonly<{group:RouteGroup;
 /** The page's name in this load's language, the same text as its sidebar button (read at render, never at module evaluation). */
 label:()=>string}>;
/** Every page with its section and name, in menu order within each section. */
export const ROUTE_PAGES=Object.freeze({
 observatory:{group:'optical',label:()=>t('sky.observatory')},
 spectrometer:{group:'optical',label:()=>t('spectrometer.nav')},
 'sky-exposure':{group:'optical',label:()=>t('skyExposure.nav')},
 'star-exposure':{group:'optical',label:()=>t('starExposure.nav')},
 'galaxy-exposure':{group:'optical',label:()=>t('galaxyExposure.nav')},
 photometer:{group:'optical',label:()=>t('ph.nav')},
 'radio-control':{group:'radio',label:()=>t('radioRoute.nav')},
 'pulsar-analysis':{group:'radio',label:()=>t('plr.nav')},
 spectrum:{group:'analysis',label:()=>t('sky.analyzer')},
 classification:{group:'analysis',label:()=>t('class.nav')},
 'cluster-database':{group:'analysis',label:()=>t('db.nav')},
 'lss-survey':{group:'analysis',label:()=>t('lss.nav')},
 'lss-wedge':{group:'analysis',label:()=>t('wedge.nav')},
 'object-x':{group:'analysis',label:()=>OBJECT_X_LAB.nav},
 'variable-stars':{group:'analysis',label:()=>VARIABLE_STARS.nav},
 images:{group:'files',label:()=>t('fits.nav')},
} as const satisfies Record<Route,RoutePage>);
const ALL=Object.keys(ROUTE_PAGES) as Route[];
const BY_GROUP=Object.freeze(Object.fromEntries(ROUTE_GROUPS.map(g=>[g,Object.freeze(ALL.filter(r=>ROUTE_PAGES[r].group===g))]))) as Readonly<Record<RouteGroup,readonly Route[]>>;
/** The pages of one section, in menu order (a stable array). */
export const routesIn=(group:RouteGroup):readonly Route[]=>BY_GROUP[group];
/** The section's name in this load's language. */
export const groupLabel=(group:RouteGroup):string=>SHELL.navGroups[group];
