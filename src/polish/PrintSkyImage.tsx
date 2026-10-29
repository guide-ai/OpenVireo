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
export default function PrintSkyImage({pointing,view,onClose}:{pointing?:Pointing;view?:'finder'|'instrument';onClose:()=>void}){
 const c=pointing?printSkyCoordinates(pointing):null;
 return <WebPrintPreview testId="print-sky" caption={L.caption} note={PM.printSky.note} clone={skyMap} onClose={onClose}
  header={[PM.printSky.view(view),...c?[PM.printSky.pointing(c.ra,c.dec)]:[]]}/>;
}
