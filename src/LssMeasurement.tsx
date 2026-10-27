import {useState} from 'react';
import galaxyText from '../data/original/GLXYLNS.LST?raw';
import {t} from './i18n';
import {INITIAL_CONTROL,changeFactor,configureStep,currentZ,moveControl,parseLines,shiftedWavelength,type ShiftControl} from './core/spectrum';
import {formatZ} from './view/spectrum';
const LINES=parseLines(galaxyText);
/** Dedicated LSS measurement panel on the same shift-control contract as the analyser (spectrum.ts 0x584424..0x5844e8):
 * the student supplies the z step, moves the control and aligns the GLXYLNS.LST lines with the raw counts. */
export default function LssMeasurement({counts,wavelengths,onRecord,disabled}:{counts:readonly number[];wavelengths:readonly number[];onRecord:(control:ShiftControl)=>void;disabled:boolean}){
 const [control,setControl]=useState<ShiftControl>(INITIAL_CONTROL),[stepText,setStepText]=useState(''),[error,setError]=useState('');
 const z=currentZ(control),min=wavelengths[0],max=wavelengths[wavelengths.length-1],peak=Math.max(1,...counts);
 const x=(w:number)=>60+(w-min)/(max-min)*860;
 const points=counts.map((n,i)=>`${x(wavelengths[i])},${306-n/peak*250}`).join(' ');
 function apply(fn:()=>ShiftControl){setError('');try{setControl(fn());}catch{setError(t('lss.measure.invalid'));}}
 return <section className="card lss-measure" aria-labelledby="lss-measure-heading"><h3 id="lss-measure-heading">{t('lss.measure.title')}</h3><p>{t('lss.measure.help')}</p>
  <svg className="source-spectrum" viewBox="0 0 980 340" role="img" aria-label={t('lss.measure.chart')}><line x1="60" x2="920" y1="306" y2="306"/><polyline points={points} fill="none"/>
   {LINES.map((line,i)=>{const w=control.step>0?shiftedWavelength(line.wavelength,z):line.wavelength;return w>=min&&w<=max?<g key={line.label}><line className="lss-line" x1={x(w)} x2={x(w)} y1="40" y2="306"/><text className="lss-line-label" x={x(w)+3} y={16+(i%3)*12}>{line.label}</text></g>:null;})}
  </svg>
  <div className="lss-controls">
   <label htmlFor="lss-step">{t('lss.measure.step')}</label><input id="lss-step" inputMode="decimal" maxLength={20} value={stepText} disabled={disabled} onChange={e=>setStepText(e.target.value)}/><button className="secondary-button" disabled={disabled} onClick={()=>apply(()=>configureStep(control,Number(stepText)))}>{t('lss.measure.setStep')}</button>
   <label htmlFor="lss-shift">{t('lss.measure.shift')}</label><input id="lss-shift" type="range" min={-100} max={100} step={1} value={control.position} disabled={disabled||control.step<=0} onChange={e=>apply(()=>moveControl(control,Number(e.target.value)))}/>
   <fieldset disabled={disabled||control.step<=0}><legend>{t('lss.measure.factor')}</legend>{([1,10] as const).map(f=><label key={f}><input type="radio" name="lss-factor" checked={control.factor===f} onChange={()=>apply(()=>changeFactor(control,f))}/>×{f}</label>)}</fieldset>
   <p data-testid="lss-current-z" role="status">{control.step>0?t('lss.measure.z',{z:formatZ(z)}):t('lss.measure.noStep')}</p>
   <button className="primary-button" disabled={disabled||control.step<=0||!counts.some(n=>n>0)} onClick={()=>onRecord(control)}>{t('lss.measure.record')}</button>
  </div>{error&&<p role="alert">{error}</p>}
 </section>;
}
