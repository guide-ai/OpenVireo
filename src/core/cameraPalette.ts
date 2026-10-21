import{roundNearestEven}from'./numericPolicy';
/** Source520f18 shared CCD/IR RGBQUAD palette. Number sqrt +nearest/even is
 * the declared browser display policy,not an x87/FISTP runtime oracle. */
export type CameraPalette=Readonly<{low:number;high:number}>;
export class CameraPaletteError extends Error{constructor(){super('Invalid camera display interval');this.name='CameraPaletteError';}}
export function cameraPalette(low:number,high:number):CameraPalette{if(!Number.isInteger(low)||!Number.isInteger(high)||low<0||high>255||low>=high)throw new CameraPaletteError();return Object.freeze({low,high});}
/** Both recovered display initializers write64/127 before calling the shared palette. */
export const INITIAL_CAMERA_PALETTE:CameraPalette=cameraPalette(64,127);
export function cameraPaletteDraft(low:string,high:string):CameraPalette{if(!/^\d{1,3}$/.test(low)||!/^\d{1,3}$/.test(high))throw new CameraPaletteError();return cameraPalette(Number(low),Number(high));}
export function cameraPaletteBytes(profile:CameraPalette):Uint8Array{const {low,high}=cameraPalette(profile.low,profile.high),out=new Uint8Array(256*4);for(let j=0;j<256;j++){const value=j<low?0:j>high?255:roundNearestEven(255*Math.sqrt((j-low)/(high-low)));out[j*4]=value;out[j*4+1]=value;out[j*4+2]=value;/* Reserved RGBQUAD byte stays0,not browser alpha. */}return out;}
