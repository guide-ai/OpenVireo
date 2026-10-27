import {useId} from 'react';
import {t} from './i18n';
import {CLASSIFICATION_CATALOG as catalog} from './core/classification';
import type {ClassificationViewport} from './core/classificationViewport';
/** Full original SPECLNS.LNL table (26 rows, both He I 4471 rows kept, keyed by index). Wavelengths and labels are shown
 * as stored in the catalog. Selecting a row only sets the existing persisted marker index (−1..25); it never suggests a type.
 * onInspect reports an explicit click on a line row, and a Space keyup on the focused checked line row: on an already-checked
 * radio browsers fire neither click nor change for Space, so onClick alone does not cover it. The keyup is not prevented and
 * repeats are harmless (the parent's credit is idempotent). Arrow keys move the native radio selection and report through
 * onChange. "No marker" is never an inspection. */
export default function ClassificationLineTable({line,view,disabled,onChange,onInspect}:{line:number;view:ClassificationViewport;disabled:boolean;onChange:(line:number)=>void;onInspect?:(line:number)=>void}){
 const name=useId();
 return <fieldset className="class-line-table" disabled={disabled} data-testid="class-line-table"><legend>{t('class.line')}</legend>
  <div className="class-line-scroll" role="region" tabIndex={0} aria-label={t('classLines.region')}><table>
   <caption>{t('classLines.caption',{count:catalog.lines.length,sha256:catalog.lineListSha256})}</caption>
   <thead><tr><th scope="col">{t('classLines.choose')}</th><th scope="col">{t('classLines.wavelength')}</th><th scope="col">{t('classLines.label')}</th><th scope="col">{t('classLines.window')}</th></tr></thead>
   <tbody>
    <tr data-line-index={-1} data-selected={line===-1||undefined}><td><input type="radio" name={name} checked={line===-1} aria-label={t('class.noLine')} onChange={()=>onChange(-1)}/></td><td colSpan={3}>{t('class.noLine')}</td></tr>
    {catalog.lines.map((l,i)=>{const outside=l.wavelength<view.minimum||l.wavelength>view.maximum;return <tr key={i} data-line-index={i} data-selected={line===i||undefined} data-line-outside={outside||undefined}>
     <td><input type="radio" name={name} checked={line===i} aria-label={t('classLines.option',{wavelength:l.wavelength,label:l.label})} onChange={()=>onChange(i)} onClick={()=>onInspect?.(i)} onKeyUp={e=>{if(e.key===' '&&!disabled&&e.currentTarget.checked)onInspect?.(i);}}/></td>
     <td className="class-line-wavelength">{l.wavelength}</td><td>{l.label}</td><td>{outside?t('classLines.outside'):t('classLines.inside')}</td></tr>;})}
   </tbody></table></div>
 </fieldset>;
}
