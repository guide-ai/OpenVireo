import {useMemo} from 'react';
import PhotometerPlotSettings from './PhotometerPlotSettings';
import {opticalProfile} from './core/opticalTelescope';
import {pleiadesPoints,pleiadesDistance,validPleiadesModulus,pleiadesPointVisible,PLEIADES_STANDARDS,PLEIADES_PLOT} from './core/pleiadesAnalysis';
import type {PhotometerState} from './core/photometer';
import {formatNumber,t} from './i18n';
const num=(v:number)=>formatNumber(v,{maximumFractionDigits:6,useGrouping:false});
const pct=(v:number)=>formatNumber(v/100,{style:'percent',signDisplay:'exceptZero',maximumFractionDigits:6,useGrouping:false});
const vTicks=Array.from({length:6},(_,i)=>PLEIADES_PLOT.vMin+i*(PLEIADES_PLOT.vMax-PLEIADES_PLOT.vMin)/5);
const x=(v:number)=>70+(v-PLEIADES_PLOT.bMinusVMin)/(PLEIADES_PLOT.bMinusVMax-PLEIADES_PLOT.bMinusVMin)*600;
const y=(v:number)=>40+(v-PLEIADES_PLOT.vMin)/(PLEIADES_PLOT.vMax-PLEIADES_PLOT.vMin)*500;
/** A web version of the printed paper/plastic-overlay exercise. No optimizer. */
export default function PleiadesAnalysis({state,busy,onConfirm,draft,onDraft}:{draft:string|null;onDraft:(text:string|null)=>void;state:PhotometerState|null;busy:boolean;onConfirm:(modulus:number)=>boolean}){
 const points=useMemo(()=>state?pleiadesPoints(state):[],[state]);
 const fit=state?.clusterFit;
 const text=draft??(fit?String(fit.modulus):''),value=/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text.trim())?Number(text):NaN,valid=validPleiadesModulus(value);
 const distance=valid?pleiadesDistance(value):null,shown=points.filter(pleiadesPointVisible);
 return <section className="card pleiades-analysis" aria-labelledby="pleiades-analysis-title"><h2 id="pleiades-analysis-title">{t('pa.title')}</h2><p>{t('pa.intro')}</p><p>{t('pa.coverage',{count:points.length,hidden:points.length-shown.length})}</p>
 <p className="observatory-note">{t('pa.chartHelp')}</p><div className="pleiades-chart-scroll" role="region" tabIndex={0} aria-label={t('pa.chartRegion')}><svg viewBox="0 0 760 620" role="img" aria-labelledby="pleiades-chart-title pleiades-chart-desc"><title id="pleiades-chart-title">{t('pa.chartTitle')}</title><desc id="pleiades-chart-desc">{t('pa.chartDescription')}</desc>
 <defs><clipPath id="pleiades-plot-clip"><rect x="70" y="40" width="600" height="500"/></clipPath></defs>
 {vTicks.map(v=><g key={v}><line x1="70" x2="670" y1={y(v)} y2={y(v)} stroke="#dce7e1"/><text x="57" y={y(v)+5} textAnchor="end">{v}</text></g>)}
 {[-.4,0,.4,.8,1.2,1.8].map(c=><g key={c}><line x1={x(c)} x2={x(c)} y1="40" y2="540" stroke="#edf2ef"/><text x={x(c)} y="567" textAnchor="middle">{num(c)}</text></g>)}
 <path d="M70 40V540H670" fill="none" stroke="#264e44" strokeWidth="2"/><text x="370" y="603" textAnchor="middle">{t('pa.axisColor')}</text><text transform="translate(18 290) rotate(-90)" textAnchor="middle">{t('pa.axisV')}</text>
 <g clipPath="url(#pleiades-plot-clip)">{valid&&<><polyline data-testid="pleiades-overlay" points={PLEIADES_STANDARDS.map(r=>`${x(r.bMinusV)},${y(r.absoluteV+value)}`).join(' ')} stroke="#b56822" strokeWidth="2.5" fill="none" strokeDasharray="7 4"/>{PLEIADES_STANDARDS.map((r,i)=><rect key={i} x={x(r.bMinusV)-3} y={y(r.absoluteV+value)-3} width="6" height="6" fill="#b56822"/>)}</>}
 {shown.map(p=>{const coincident=shown.filter(q=>q.bMinusV===p.bMinusV&&q.v===p.v);return <g key={p.targetId} data-testid="pleiades-manual-point"><circle cx={x(p.bMinusV)} cy={y(p.v)} r="5" fill="#206252"/>{coincident[0]===p&&<text data-testid="pleiades-point-label" textAnchor={x(p.bMinusV)>620?'end':'start'} x={x(p.bMinusV)+(x(p.bMinusV)>620?-8:8)} y={y(p.v)<62?y(p.v)+20:y(p.v)-7} fill="#174a3f">{coincident.length>3?t('pa.coincident',{count:coincident.length}):coincident.map(q=>q.hotlistNumber).join(', ')}</text>}</g>;})}</g></svg></div>
 <PhotometerPlotSettings points={points} prefix="pleiades"/><p>{t('pa.legend')}</p><p>{t('pa.fitHelp')}</p>
 <label htmlFor="pleiades-modulus">{t('pa.modulus')}</label><input id="pleiades-modulus" type="text" inputMode="decimal" maxLength={80} value={text} disabled={busy} onChange={e=>onDraft(e.target.value)}/>
 {text!==''&&!valid&&<p role="alert">{t('pa.invalid')}</p>}
 <div className="sky-actions"><button className="primary-button" disabled={busy||state?.phase==='running'||points.length<2||!valid||fit?.modulus===value} onClick={()=>{if(onConfirm(value))onDraft(null);}}>{t('pa.confirm')}</button><button className="secondary-button" disabled={busy||draft===null} onClick={()=>onDraft(null)}>{t('pa.cancel')}</button></div>
 {distance&&draft!==null&&<p>{t('pa.preview',{pc:num(distance.parsecs),ly:num(distance.lightYears),percent:pct(distance.signedPercentFrom410Ly)})}</p>}
 {fit?<section aria-label={t('pa.confirmed')}><h3>{t('pa.confirmed')}</h3><dl className="pleiades-results"><dt>{t('pa.modulus')}</dt><dd data-testid="pleiades-confirmed-modulus">{num(fit.modulus)}</dd><dt>{t('pa.parsecs')}</dt><dd data-testid="pleiades-distance-pc">{num(fit.parsecs)}</dd><dt>{t('pa.lightYears')}</dt><dd data-testid="pleiades-distance-ly">{num(fit.lightYears)}</dd><dt>{t('pa.historical')}</dt><dd data-testid="pleiades-percent">{pct(fit.signedPercentFrom410Ly)}</dd></dl><p>{t('pa.resultHelp',{count:fit.points.length})}</p></section>:<p>{t('pa.unconfirmed')}</p>}
 <details><summary>{t('pa.rows')}</summary><div className="photometer-table"><table className="pleiades-points"><thead><tr>{(['pa.star','pa.pair','pa.manualB','pa.manualV','pa.manualColor','ph.telescopeColumn','ph.apertureColumn']as const).map(k=><th key={k}>{t(k)}</th>)}</tr></thead><tbody>{points.map(p=><tr key={p.targetId}><td>{p.hotlistNumber}</td><td>{p.bReadingId} / {p.vReadingId}</td><td>{num(p.b)}</td><td>{num(p.v)}</td><td>{num(p.bMinusV)}</td><td>{opticalProfile(p.telescopeIndex??0).name}</td><td>{p.apertureSelector??10}</td></tr>)}</tbody></table></div></details>
 <details><summary>{t('pa.standards')}</summary><p>{t('pa.standardHelp')}</p><div className="photometer-table"><table><thead><tr><th>{t('pa.spectral')}</th><th>{t('pa.absoluteV')}</th><th>{t('pa.manualColor')}</th></tr></thead><tbody>{PLEIADES_STANDARDS.map((r,i)=><tr key={i}><td>{r.spectralLabelAsPrinted}</td><td>{num(r.absoluteV)}</td><td>{num(r.bMinusV)}</td></tr>)}</tbody></table></div></details>
 <p className="observatory-note">{t('pa.limits')}</p></section>;
}
