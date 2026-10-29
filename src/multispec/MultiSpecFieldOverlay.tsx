import {useEffect,useId,useRef,useState,type KeyboardEvent,type MouseEvent} from 'react';
import type {RgbImage} from '../core/photons';
import {TELESCOPE_FRAME} from '../core/catalogObject';
import {roundNearestEven} from '../core/numericPolicy';
import type {MultiSpecSelection} from '../core/multiSpecSpectrum';
import {t} from '../i18n';

const SIZE=TELESCOPE_FRAME.crop,ORIGIN=TELESCOPE_FRAME.cropOrigin;
/** Front M: the Telescope display of the Multi-Spec field (the engine's 312² viewport) with the selection markers (0x53d6f0:
 * a 15×15 rectangle at each selection, green, red for the one under removal; its number := list base + position, drawn left of
 * the box, right when it would leave the display). Left click (or the keyboard cursor + Enter) selects; right click (or Delete)
 * asks to remove. Clicks reach the caller only when `armed` (Edit Mode, Object X; decision D1). Coordinates are control pixels
 * 0..311 (the VCL's integers); the caller adds the crop origin (multiSpecClickPoint). [W] The markers are drawn on this copy of
 * the Telescope display, not on the observatory's sky map. */
export default function MultiSpecFieldOverlay({image,selections,base,removing,armed,onSelect,onRemove}:Readonly<{image:RgbImage;selections:readonly MultiSpecSelection[];base:number;removing:number|null;armed:boolean;
 onSelect:(x:number,y:number)=>void;onRemove:(x:number,y:number)=>void}>){
 const helpId=useId(),canvas=useRef<HTMLCanvasElement>(null),[cursor,setCursor]=useState({x:SIZE/2,y:SIZE/2});
 useEffect(()=>{const c=canvas.current,ctx=c?.getContext('2d');if(!c||!ctx)return;const data=ctx.createImageData(image.width,image.height);
  for(let i=0;i<image.width*image.height;i++){data.data[i*4]=image.rgb[i*3];data.data[i*4+1]=image.rgb[i*3+1];data.data[i*4+2]=image.rgb[i*3+2];data.data[i*4+3]=255;}ctx.putImageData(data,0,0);},[image]);
 const point=(e:MouseEvent<SVGSVGElement>)=>{const b=e.currentTarget.getBoundingClientRect();
  return {x:Math.min(SIZE-1,Math.max(0,Math.floor((e.clientX-b.left)*SIZE/b.width))),y:Math.min(SIZE-1,Math.max(0,Math.floor((e.clientY-b.top)*SIZE/b.height)))};};
 function click(e:MouseEvent<SVGSVGElement>){const p=point(e);setCursor(p);if(armed)onSelect(p.x,p.y);}
 function context(e:MouseEvent<SVGSVGElement>){e.preventDefault();const p=point(e);setCursor(p);if(armed)onRemove(p.x,p.y);}
 function key(e:KeyboardEvent<SVGSVGElement>){
  const step=e.shiftKey?20:2,moves:Record<string,[number,number]>={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]};
  if(moves[e.key]){e.preventDefault();const [dx,dy]=moves[e.key];setCursor(c=>({x:Math.min(SIZE-1,Math.max(0,c.x+dx)),y:Math.min(SIZE-1,Math.max(0,c.y+dy))}));}
  else if(e.key==='Enter'||e.key===' '){e.preventDefault();if(armed)onSelect(cursor.x,cursor.y);}
  else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();if(armed)onRemove(cursor.x,cursor.y);}
 }
 return <div><div className="ms-field">
  <canvas ref={canvas} width={image.width} height={image.height} aria-hidden="true"/>
  <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="application" tabIndex={0} aria-label={t('multispec.fieldLabel')} aria-describedby={helpId} data-testid="ms-field" data-armed={armed}
   onClick={click} onContextMenu={context} onKeyDown={key}>
   {selections.map((s,i)=>{const x=roundNearestEven(s.x)-ORIGIN,y=roundNearestEven(s.y)-ORIGIN,n=base+i,left=x-8-String(n).length*7<0;
    return <g key={i} data-testid={`ms-marker-${n}`}><rect x={x-7.5} y={y-7.5} width={15} height={15} fill="none" stroke={removing===i?'#ff0000':'#00ff00'} strokeWidth={1.5}/>
     <text x={left?x+10:x-10} y={y+4} textAnchor={left?'start':'end'} fontSize={11} fill={removing===i?'#ff0000':'#00ff00'}>{n}</text></g>;})}
   <g stroke="#ffd36b" strokeWidth={1} opacity={.9} aria-hidden="true"><path d={`M${cursor.x-8} ${cursor.y}h5m6 0h5M${cursor.x} ${cursor.y-8}v5m0 6v5`}/></g>
  </svg></div>
  <p className="observatory-note" id={helpId}>{armed?t('multispec.fieldHelp'):t('multispec.fieldNotArmed')}</p>
 </div>;
}
