/** Stable English diagnostics and canonical unidentified label preserve the
 * existing pure-core contract. UI maps typed keys/values to its chosen catalog;
 * no selected presentation language can mutate measurements or file bytes. */
export const DIAGNOSTIC_ENGLISH=Object.freeze({
 "error.columns":"Line {line}: two columns are required.",
 "error.configure":"Set a z step before recording.",
 "error.decimal":"Line {line}: expected a decimal number with a dot.",
 "error.domain":"Wavelength or z is outside the positive domain.",
 "error.fileSize":"The file exceeds 2 MiB.",
 "error.finite":"Line {line}: the value is not finite.",
 "error.identity":"Invalid measurement identity.",
 "error.lineFormat":"Line list: invalid format on line {line}.",
 "error.normalized":"Line {line}: normalize intensity to the 0–1 range before importing.",
 "error.ordered":"Line {line}: wavelengths must be positive, strictly increasing and unique.",
 "error.overflow":"Shifted wavelength overflow.",
 "error.position":"Position is outside the local control range.",
 "error.positive":"Line {line}: wavelength must be positive.",
 "error.representable":"The measurement cannot be represented.",
 "error.sampleCount":"A spectrum must contain between 2 and 50,000 samples.",
 "error.step":"Enter a z step greater than 0 and at most 1 (this interface’s limit).",
 "error.storedDomain":"This z rounds to −1 as float32 and cannot preserve positive wavelengths. Choose an adjustment whose stored value remains greater than −1.",
 "error.transferIdentity":"Invalid acquisition identity.",
 "error.transferJournal":"Acquisition counters do not match their replay journal.",
 "error.transferMismatch":"Acquisition journal identity mismatch.",
 "error.transferPause":"Pause before analysis.",
 "error.transferPositive":"Commit positive counts before analysis.",
 "error.zPositive":"The adjustment must preserve positive wavelengths (z > −1).",
 "sky.invalidCatalog":"The local sky catalog could not be read.",
 "sky.invalidCoordinates":"Enter right ascension from 0 to less than 24 hours and declination from −90 to +90 degrees.",
 "ssp.intensity":"SSP intensity is outside the supported signed int32/max-positive normalization range (−2147483648 to 1).",
 "ssp.invalid":"Unsupported SSP ({code}). Expected an ASCII *SpHdr* header and 600 ordered, finite dot-decimal samples.",
}as const);
export const UNIDENTIFIED_OBJECT='Unidentified';
export type DiagnosticKey=keyof typeof DIAGNOSTIC_ENGLISH;
type Names<S extends string>=S extends `${string}{${infer P}}${infer Tail}`?P|Names<Tail>:never;
type Args<K extends DiagnosticKey>=[Names<typeof DIAGNOSTIC_ENGLISH[K]>]extends[never]?[values?:never]:[values:{readonly[P in Names<typeof DIAGNOSTIC_ENGLISH[K]>]:string|number}];
export class CatalogDiagnostic extends Error {
 readonly values:Readonly<Record<string,string|number>>;
 constructor(readonly key:DiagnosticKey,values:Readonly<Record<string,string|number>>={}){super(DIAGNOSTIC_ENGLISH[key].replace(/\{(\w+)\}/g,(_,name:string)=>String(values[name])));this.name='CatalogDiagnostic';this.values=Object.freeze({...values});}
}
export function diagnosticError<K extends DiagnosticKey>(key:K,...args:Args<K>):CatalogDiagnostic{return new CatalogDiagnostic(key,args[0]??{});}
