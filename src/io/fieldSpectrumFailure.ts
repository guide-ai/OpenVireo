// Front G: how a failed field-spectrometer preparation is shown (kept apart so the page need not load the spectrometer inputs).
import type {PreparedFieldSpectrum} from './fieldSpectrometer';

/** What the page shows when preparing failed outside the typed results (G4a closure N1, G final closure N3). A same-origin file
 * that did not arrive (a loader's 'download', a tile's 'fetch', or the browser's network TypeError) is a missing catalogue piece
 * the student may retry; one that arrived but did not match its recorded identity ('size', 'sha256', 'integrity', 'resource')
 * or a tile index that cannot be read is load-error; anything else is an internal error, never "fetch". */
export type FieldSpectrumShown=PreparedFieldSpectrum|Readonly<{status:'unavailable';reason:'load-error'|'internal'}>;
const LOADER_ERROR=/^(BoundedResource|Bundled\w+|GscTile|FieldSpectrometer)Error$/;
export function fieldSpectrumFailure(e:unknown):FieldSpectrumShown{
 if(e instanceof TypeError&&/fetch|network|load failed/i.test(e.message))return Object.freeze({status:'unavailable',reason:'field-tiles',detail:'fetch'});
 if(e instanceof Error&&LOADER_ERROR.test(e.name)){
  const code=(e as Error&{code?:unknown}).code;
  if(code==='download'||code==='fetch')return Object.freeze({status:'unavailable',reason:'field-tiles',detail:'fetch'});
  if(code==='size'||code==='sha256'||code==='integrity'||code==='resource'||(e.name==='GscTileError'&&(code==='index'||code==='missing-tile')))return Object.freeze({status:'unavailable',reason:'load-error'});
 }
 return Object.freeze({status:'unavailable',reason:'internal'});
}
