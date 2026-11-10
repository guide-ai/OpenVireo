import {lazy,type ComponentType} from 'react';
import {loadArea,type AreaName} from '../i18n/areas';
/** Front ES-SPLIT [W] (docs/I18N.md): React.lazy for a route whose text is in a language area. The route's JavaScript and the
 * area's text are fetched together, and the route renders when both are in. English fetches nothing more. A route chunk that
 * fails still reaches LazyBoundary's notice; an area that fails only leaves that text in English (loadArea never rejects).
 * scripts/i18n-split.mjs reads these call sites: the first argument is a literal area name, the second `()=>import('…')`. */
export function lazyArea<T extends ComponentType<any>>(area:AreaName,load:()=>Promise<{default:T}>){
 return lazy(()=>{const text=loadArea(area);return Promise.all([load(),text]).then(([module])=>module);});
}
