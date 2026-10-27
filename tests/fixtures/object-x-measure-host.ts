// TEST-ONLY host for tests/object-x-measure.spec.ts. Imported only by that spec through the Vite dev server after the real App
// has loaded; not a product route, no window hook. The two images are AUTHORED synthetic FITS (Gaussian stars on a flat sky with
// a TAN WCS), not CLEA observations: image 2 is the same field shifted by (+3, −2) px and its "asteroid" moved 6 px north.
import {createElement as h,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {parseFitsImage} from '../../src/core/fitsImage';
import {tanWcsFromCards,type MeasurementLog} from '../../src/core/astrometryMeasure';
import {ObjectXMeasure,type MeasureFrame} from '../../src/ObjectXMeasure';

export const MEASURE_HOST_TEST_ID='objectx-measure-host';
export const STARS=[{x:20.3,y:15.7,flux:4000},{x:75.6,y:22.2,flux:3000},{x:30.1,y:66.4,flux:5000},{x:80.4,y:61.9,flux:2500}];
export const ASTEROID={x:50.25,y:41.6,flux:1800};
export const SHIFT={x:3,y:-2},MOVE=6;
const card=(s:string)=>s.padEnd(80,' ');
function fits(stars:readonly {x:number;y:number;flux:number}[],crpix:{x:number;y:number}):Uint8Array{
 const width=96,height=80;
 const cards=['SIMPLE  =                    T','BITPIX  =                  -32','NAXIS   =                    2',`NAXIS1  = ${String(width).padStart(20)}`,`NAXIS2  = ${String(height).padStart(20)}`,
  "CTYPE1  = 'RA---TAN'","CTYPE2  = 'DEC--TAN'",'CRVAL1  = 340.83','CRVAL2  = -8.04',`CRPIX1  = ${crpix.x}`,`CRPIX2  = ${crpix.y}`,'CDELT1  = -3.333333333333333E-4','CDELT2  = 3.333333333333333E-4','END'].map(card);
 const header=cards.join('').padEnd(2880,' '),out=new Uint8Array(2880+Math.ceil(width*height*4/2880)*2880),view=new DataView(out.buffer);
 for(let i=0;i<header.length;i++)out[i]=header.charCodeAt(i);
 for(let y=1;y<=height;y++)for(let x=1;x<=width;x++){let v=100;for(const s of stars)v+=s.flux*Math.exp(-((x-s.x)**2+(y-s.y)**2)/(2*1.4*1.4));view.setFloat32(2880+4*((y-1)*width+x-1),v,false);}
 return out;
}
function frame(label:string,jd:number,bytes:Uint8Array):MeasureFrame{const image=parseFitsImage(bytes);return {label,jd,image,wcs:tanWcsFromCards(image.cards)};}
const shift=(s:{x:number;y:number;flux:number})=>({...s,x:s.x+SHIFT.x,y:s.y+SHIFT.y});
const FRAMES=[
 frame('t1',2454983.6666666665,fits([...STARS,ASTEROID],{x:48.5,y:40.5})),
 frame('t2',2454983.7083333335,fits([...STARS,{...ASTEROID,y:ASTEROID.y+MOVE}].map(shift),{x:48.5+SHIFT.x,y:40.5+SHIFT.y})),
];
function Host(){
 const [log,setLog]=useState<MeasurementLog>([]);
 return h('div',null,h(ObjectXMeasure,{frames:FRAMES,log,onLogChange:setLog}),h('output',{'data-testid':'host-log'},JSON.stringify(log.map(m=>[m.frame,m.role,Number(m.x.toFixed(3)),Number(m.y.toFixed(3))]))));
}
export function mountObjectXMeasureHost():void{
 const container=document.createElement('div');container.setAttribute('data-testid',MEASURE_HOST_TEST_ID);
 document.body.prepend(container);createRoot(container).render(h(Host));
}
