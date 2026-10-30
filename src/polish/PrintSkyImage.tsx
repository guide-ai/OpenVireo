import {printSkyFooter,printSkyHeader,type PrintSkyInstrument} from '../core/printSkyText';
import type {Pointing} from '../core/sky';
import WebPrintPreview from './WebPrintPreview';
import {POLISH_MESSAGES as PM,PRINT_SKY_LITERALS as L} from './PolishMessages';

const skyMap=()=>document.querySelector('[data-testid="sky-map"]');

/** File › Print Sky Image... (PrintSkyImage1Click 0x53f934, OB-SR-03; Front K2.3): VIREO's header 0x58e860, the sky image
 * (0x53f9e4, colour-inverted by cmNotSrcCopy) and the footer 0x53fe14, from core/printSkyText.ts. The web prints the sky view
 * as shown [W], inverted like VIREO's copy. `instrument` is null where the web has no instrument choice (a web note is
 * printed instead). */
export default function PrintSkyImage({pointing,view,telescope,instrument,onClose,clone=skyMap}:{pointing?:Pointing;view?:'finder'|'instrument';
 /** The telescope name VIREO prints (its telescope record name). */telescope:string;
 /** The selected instrument in the telescope view; the finder view always prints Finder. */instrument:PrintSkyInstrument;onClose:()=>void;
 /** The picture to print (default: the observatory sky map). Multi-Spec passes its own field with its markers. */
 clone?:()=>Element|null}){
 const footer=pointing?printSkyFooter({raHours:pointing.ra,decDegrees:pointing.dec,telescope,instrument:view==='finder'?'finder':instrument,instrumentText:PM.printSky.noInstrument}):undefined;
 return <WebPrintPreview testId="print-sky" caption={L.caption} note={PM.printSky.note} clone={clone} onClose={onClose} invert
  nativeHeader={date=>printSkyHeader(date)} footer={footer}/>;
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
