import{FITS_MAX_BYTES,parseFitsImage,fitsImageBytes,FitsError,type FitsImage}from'../core/fitsImage';
export type InspectedFits=Readonly<{name:string;sha256:string;image:FitsImage}>;
export async function readFitsImage(file:File):Promise<InspectedFits>{if(!/\.(fit|fts|fits)$/i.test(file.name))throw new FitsError('profile');if(file.size>FITS_MAX_BYTES)throw new FitsError('size');const bytes=new Uint8Array(await file.arrayBuffer()),image=parseFitsImage(bytes),digest=new Uint8Array(await crypto.subtle.digest('SHA-256',fitsImageBytes(image).buffer as ArrayBuffer));return Object.freeze({name:file.name.slice(0,160),image,sha256:Array.from(digest,b=>b.toString(16).padStart(2,'0')).join('')});}
/** The bytes of a chosen FITS file, refused by its declared size before any byte is read (security review of 2026-11-14):
 * a file over FITS_MAX_BYTES can never parse, so it is never loaded into memory. No extension check: the Object X lab takes
 * whatever file the visitor picks and lets the parser decide. */
export async function readFitsBytes(file:Pick<File,'size'|'arrayBuffer'>):Promise<Uint8Array>{if(file.size>FITS_MAX_BYTES)throw new FitsError('size');return new Uint8Array(await file.arrayBuffer());}
