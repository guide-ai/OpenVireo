import{useMemo,type ReactNode}from'react';
import{prepareOriginalFluxProbe,SpectrumProbeError}from'./core/spectrumProbe';
import{prepareLoadedFluxProbe}from'./core/loadedSpectrumProbe';
import{photographicSpectrum,PhotoSpectrumError}from'./core/photoSpectrum';
import type{FluxChoice}from'./SampledFlux';
import{t}from'./i18n';
export default function PhotographicSpectrum({choice,label,reverse,line,fallback}:{choice:FluxChoice;label:string;reverse:boolean;line:number|null;fallback:ReactNode}){
 const result=useMemo(()=>{try{if(!choice.spectrum)throw new SpectrumProbeError('source');if(choice.external&&(choice.external.sha256!==choice.spectrum.sha256||choice.external.samples!==choice.spectrum.samples))throw new SpectrumProbeError('source');const probe=choice.external?prepareLoadedFluxProbe(choice.external):prepareOriginalFluxProbe(choice.sourceId,choice.spectrum);return{strip:photographicSpectrum(probe.grid,reverse),source:probe.source,error:null};}catch(value){return{strip:null,source:null,error:value instanceof PhotoSpectrumError?value.code:value instanceof SpectrumProbeError?value.code:'grid'};}},[choice.sourceId,choice.spectrum,choice.external,reverse]);
 if(!result.strip)return <div className="photo-fallback"><p role="status">{t(result.error==='peak'?'photo.noPeak':'photo.unavailable')}</p>{fallback}</div>;
 const name=t('photo.caption',{label,polarity:t(reverse?'photo.negative':'photo.positive')});
 return <figure className="class-plot photo-spectrum" data-photo-policy={result.strip.policy} data-photo-source={result.source!.probeId} data-photo-sha256={result.source!.sha256} data-photo-peak={result.strip.peak}><figcaption>{name}</figcaption><svg className="photo-strip" viewBox="0 0 500 85" preserveAspectRatio="none" role="img" aria-label={name} shapeRendering="crispEdges">{result.strip.columns.filter(c=>c.painted).map(c=><rect key={c.index} x={c.index} y="0" width="1" height="85" fill={`rgb(${c.gray},${c.gray},${c.gray})`}/>)}{line!==null&&line>=3900&&line<4500&&<line x1={(line-3900)/1.2} x2={(line-3900)/1.2} y1="0" y2="85" className="class-marker"/>}</svg><div className="photo-axis" aria-hidden="true">{[3900,4000,4100,4200,4300,4400,4500].map(w=><span key={w}>{w}</span>)}</div><p className="photo-axis-label">{t('photo.axis')}</p></figure>;
}
