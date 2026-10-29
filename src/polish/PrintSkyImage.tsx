import {splitSexagesimal} from '../core/radioAntenna';
import type {Pointing} from '../core/sky';
import WebPrintPreview from './WebPrintPreview';
import {POLISH_MESSAGES as PM,PRINT_SKY_LITERALS as L} from './PolishMessages';

const two=(n:number)=>String(n).padStart(2,'0');
/** RA hh mm ss.s and Dec ±dd mm ss for the print header (web formatting). */
export function printSkyCoordinates(p:Pointing):{ra:string;dec:string}{
 const ra=splitSexagesimal(p.ra,1),dec=splitSexagesimal(p.dec,1);
 return {ra:`${two(ra.whole)} ${two(ra.minutes)} ${ra.seconds.toFixed(1).padStart(4,'0')}`,dec:`${dec.sign<0?'-':'+'}${two(dec.whole)} ${two(dec.minutes)} ${dec.seconds.toFixed(1).padStart(4,'0')}`};
}
const skyMap=()=>document.querySelector('[data-testid="sky-map"]');

/** File › Print Sky Image... (PrintSkyImage1Click 0x53f934, OB-SR-03): VIREO prints a header (0x58e860), the sky image
 * (0x53f9e4, scale 1.5) and a footer (0x53fe14), whose contents are not decoded. The web prints the sky view as shown [W]. */
export default function PrintSkyImage({pointing,view,onClose,clone=skyMap}:{pointing?:Pointing;view?:'finder'|'instrument';onClose:()=>void;
 /** The picture to print (default: the observatory sky map). Multi-Spec passes its own field with its markers. */
 clone?:()=>Element|null}){
 const c=pointing?printSkyCoordinates(pointing):null;
 return <WebPrintPreview testId="print-sky" caption={L.caption} note={PM.printSky.note} clone={clone} onClose={onClose}
  header={[PM.printSky.view(view),...c?[PM.printSky.pointing(c.ra,c.dec)]:[]]}/>;
}

const SVG='http://www.w3.org/2000/svg';
/** Multi-Spec's Telescope display as shown (Front P review N1): the field canvas as an image plus copies of its selection
 * markers (`[data-testid^="ms-marker-"]`), without the keyboard cursor. It is the picture the student sees, so it shows
 * nothing the Object X masks hide. null when the field is not shown. */
export function multiSpecFieldPicture(wrap:Element|null):Element|null{
 const canvas=wrap?.querySelector('canvas'),svg=wrap?.querySelector('svg[data-testid="ms-field"]');
 if(!(canvas instanceof HTMLCanvasElement)||!svg)return null;
 let href:string;try{href=canvas.toDataURL('image/png');}catch{return null;}
 const out=document.createElementNS(SVG,'svg');out.setAttribute('viewBox',svg.getAttribute('viewBox')??`0 0 ${canvas.width} ${canvas.height}`);out.setAttribute('data-testid','ms-field-print');
 const image=document.createElementNS(SVG,'image');image.setAttribute('href',href);image.setAttribute('x','0');image.setAttribute('y','0');image.setAttribute('width',String(canvas.width));image.setAttribute('height',String(canvas.height));
 out.append(image);
 svg.querySelectorAll('[data-testid^="ms-marker-"]').forEach(g=>{const c=g.cloneNode(true) as Element;c.setAttribute('data-testid',`print-${g.getAttribute('data-testid')}`);out.append(c);});
 return out;
}
