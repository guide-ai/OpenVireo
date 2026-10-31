import {useCallback,useContext,useEffect,useRef,useState} from 'react';
import {VireoOptionsContext} from '../vireoOptionsContext';
import {hrFormShowMonochrome,hrPrintFlags,hrScheme,type HrScheme} from '../core/hrScheme';

/** Front R4c: the HR form's screen flag (+0x3d9). FormShow (0x542175) reads Monochrome Displays each time the view is shown
 * (`shown` turns true); an option change while it is shown waits for the next show or print. `printed` is called by the print
 * preview's Print… (PrintDialog OK, 0x542fa1): the screen then takes Monochrome Displays as of that print. */
export function useHrScheme(shown:boolean):Readonly<{scheme:HrScheme;printMonochrome:()=>boolean;printed:()=>void}>{
 const options=useContext(VireoOptionsContext),latest=useRef(options);latest.current=options;
 const [monochrome,setMonochrome]=useState(()=>hrFormShowMonochrome(options));
 useEffect(()=>{if(shown)setMonochrome(hrFormShowMonochrome(latest.current));},[shown]);
 const printMonochrome=useCallback(()=>hrPrintFlags(latest.current).printMonochrome,[]);
 const printed=useCallback(()=>setMonochrome(hrPrintFlags(latest.current).displayMonochromeAfter),[]);
 return {scheme:hrScheme(monochrome),printMonochrome,printed};
}
