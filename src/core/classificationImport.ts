import grid from '../../data/classification/printed-grid.json';
import type {Sample} from './spectrum';
import type {LegacySpectrumHeader} from './legacySpectrumFile';
export const CLASSIFICATION_IMPORT_POLICY='OpenVireo-visual-import-v1';
export const MAX_CLASSIFICATION_IMPORTS=4,MAX_CLASSIFICATION_IMPORT_BYTES=4*1024*1024;
export type ClassificationImport=Readonly<{kind:'imported-spectrum';name:string;sha256:string;sourceText:string;samples:readonly Sample[];legacyHeader?:LegacySpectrumHeader}>;
/** Classify's wavelength domain (TSpecRangeDlg / TSpecDsplyRngDlg: 3500..7400 Å) and its smallest window (one 100 Å step). */
export const CLASSIFICATION_DOMAIN=Object.freeze({minimum:3500,maximum:7400}),CLASSIFICATION_MINIMUM_OVERLAP=100;
/** Front S (decision D3, 2026-10-29) [W]: VIREO's loader (0x55ee14) admits any file and builds a uniform grid from its first
 * and last wavelengths; no admission rule was recovered. OpenVireo admits a spectrum whose wavelengths overlap Classify's
 * 3500–7400 Å domain by at least 100 Å (one smallest display window), with at least two samples in that overlap, finite
 * increasing wavelengths and every intensity in 0–1. (It used to require 3900–4500 Å, which an LSS spectrum at 4000–5000 Å
 * cannot meet.) Parts of a display window outside the spectrum have no data (docs/CLASSIFICATION-IMPORT.md). */
export function classificationCoverage(samples:readonly Sample[]):boolean{
 let previous=0;
 if(!Array.isArray(samples)||samples.length<2||samples.length>50000)return false;
 for(const p of samples){if(!p||!Number.isFinite(p.wavelength)||p.wavelength<=previous||!Number.isFinite(p.intensity)||p.intensity<0||p.intensity>1)return false;previous=p.wavelength;}
 const lo=Math.max(samples[0].wavelength,CLASSIFICATION_DOMAIN.minimum),hi=Math.min(samples.at(-1)!.wavelength,CLASSIFICATION_DOMAIN.maximum);
 return hi-lo>=CLASSIFICATION_MINIMUM_OVERLAP&&samples.filter(p=>p.wavelength>=lo&&p.wavelength<=hi).length>=2;
}
/** Compare every printed wavelength, not a length/endpoints/nominal-step guess.
 * Generated from the pinned original grid; all eight atlas grids are tested. */
export function classificationImportDifferenceAllowed(source:Pick<ClassificationImport,'samples'>):boolean{return source.samples.length===grid.wavelengths.length&&source.samples.every((s,i)=>s.wavelength===grid.wavelengths[i]);}
/** Pure bounds only. Cryptographic byte parsing/verification belongs to IO. */
export function checkClassificationImports(sources:readonly ClassificationImport[]):void{
 if(sources.length>MAX_CLASSIFICATION_IMPORTS)throw Error('Classification import archive is full');
 let bytes=0;const seen=new Set<string>();
 for(const s of sources){if(s.kind!=='imported-spectrum'||typeof s.name!=='string'||!s.name.length||s.name.length>1024||!/^[a-f0-9]{64}$/.test(s.sha256)||seen.has(s.sha256)||typeof s.sourceText!=='string'||new TextEncoder().encode(s.sourceText).byteLength>2*1024*1024||!classificationCoverage(s.samples))throw Error('Unsupported classification import');seen.add(s.sha256);bytes+=new TextEncoder().encode(s.sourceText).byteLength;}
 if(bytes>MAX_CLASSIFICATION_IMPORT_BYTES)throw Error('Classification imports exceed their byte budget');
}
