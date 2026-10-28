/** QSO source spectrum of CLEA_VEO.exe (781bc970…c54c), static reading only (Front F, Object X QSO branch).
 *
 * File: QSOSpect.dat (approved byte-exact, 49506 bytes, SHA-256 7ab66291…a9cd): 8251 records of 6 bytes, Int16 rest wavelength
 * (302..8552 Å, step 1) and Single intensity.
 * Constructor 0x55e330 (called by the QSO preparation 0x50e7b0 with the selected QSO's Single z (object +0x35) and the configured
 * Single minimum/maximum):
 *  - +0x2d = z + 1.0 (Extended); rest minimum = minimum/(1+z), clamped up to 302.0; rest maximum = maximum/(1+z), clamped down
 *    to 8552.0;
 *  - first record = Round(restMin − 302) (0x403700, FISTP), count = Round(restMax − restMin) + 1;
 *  - 0x55df2c builds the grid with endpoints restMin..restMax and lastIndex = count, so it allocates count+1 slots and the step is
 *    (restMax − restMin)/count; the reader then fills only the first count slots from the file (the last slot stays 0);
 *  - every value is divided by the largest value read (initial 0).
 * Sampler 0x55e52c: value(λ) = 0x55dfe0(λ / (1+z)) — the ordinary quadratic uniform sampler (acquisition.ts).
 * Number arithmetic with nearest-even rounding is the declared browser policy (FISTP under the session control word is not
 * measured); an unreadable or all-zero window is a typed error, never a substitute. */
import {AcquisitionError,sampleUniformSpectrum,uniformSpectrum,type UniformSpectrum} from './acquisition';
import {galaxyChannelGrid} from './galaxySpectrum';
import {roundNearestEven} from './numericPolicy';

export class QsoSpectrumError extends Error{
 constructor(readonly code:'file'|'redshift'|'window'|'normalization'|'range'){super(`QSO spectrum: ${code}`);this.name='QsoSpectrumError';}
}
export const QSO_SPECTRUM_FILE=Object.freeze({name:'QSOSpect.dat',path:'/original/spectra/QSOSpect.dat',bytes:49506,records:8251,sha256:'7ab662914042f0cf9213b3e988834fc61d68f57751f89f9d69e46f06e7d7a9cd',firstWavelength:302,lastWavelength:8552});
export type QsoSpectrumFile=Readonly<{intensities:readonly number[]}>;
/** Bytes already checked for size and SHA-256 by the caller; the record wavelengths must be 302..8552 in order. */
export function decodeQsoSpectrumFile(bytes:Uint8Array):QsoSpectrumFile{
 if(!(bytes instanceof Uint8Array)||bytes.byteLength!==QSO_SPECTRUM_FILE.bytes)throw new QsoSpectrumError('file');
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),out:number[]=[];
 for(let i=0;i<QSO_SPECTRUM_FILE.records;i++){
  if(v.getInt16(i*6,true)!==QSO_SPECTRUM_FILE.firstWavelength+i)throw new QsoSpectrumError('file');
  const x=v.getFloat32(i*6+2,true);if(!Number.isFinite(x))throw new QsoSpectrumError('file');out.push(x);
 }
 return Object.freeze({intensities:Object.freeze(out)});
}
export type QsoSource=Readonly<{onePlusZ:number;restMinimum:number;restMaximum:number;firstRecord:number;count:number;spectrum:UniformSpectrum}>;
/** 0x55e330 for one QSO redshift and the configured interval. */
export function prepareQsoSource(file:QsoSpectrumFile,redshift:number,minimum:number,maximum:number):QsoSource{
 const z=Math.fround(redshift),min=Math.fround(minimum),max=Math.fround(maximum);
 if(!Number.isFinite(z)||z<=-1)throw new QsoSpectrumError('redshift');
 if(!Number.isFinite(min)||!Number.isFinite(max)||min<=0||max<=min)throw new QsoSpectrumError('window');
 const onePlusZ=z+1;let restMinimum=min/onePlusZ,restMaximum=max/onePlusZ;
 if(!(restMinimum>=302))restMinimum=302;if(restMaximum>8552)restMaximum=8552;
 const firstRecord=roundNearestEven(restMinimum-302),count=roundNearestEven(restMaximum-restMinimum)+1;
 if(!(restMaximum>restMinimum)||firstRecord<0||count<2||firstRecord+count>QSO_SPECTRUM_FILE.records||count>50_000)throw new QsoSpectrumError('window');
 const read=file.intensities.slice(firstRecord,firstRecord+count);let peak=0;for(const x of read)if(peak<x)peak=x;
 if(!(peak>0))throw new QsoSpectrumError('normalization');
 const values=[...read.map(x=>x/peak),0];// lastIndex = count: the final slot is allocated (0x55df2c) but never read
 let spectrum:UniformSpectrum;try{spectrum=uniformSpectrum(restMinimum,restMaximum,values);}catch(e){if(e instanceof AcquisitionError)throw new QsoSpectrumError('window');throw e;}
 return Object.freeze({onePlusZ,restMinimum,restMaximum,firstRecord,count,spectrum});
}
export type QsoProfile=Readonly<{wavelengths:readonly number[];values:readonly number[];step:number;source:QsoSource}>;
/** 600 channels on the recovered grid (galaxyChannelGrid), each sampled through 0x55e52c. */
export function prepareQsoProfile(file:QsoSpectrumFile,redshift:number,minimum:number,maximum:number):QsoProfile{
 const source=prepareQsoSource(file,redshift,minimum,maximum),grid=galaxyChannelGrid(minimum,maximum);
 const values=grid.wavelengths.map(w=>{const s=sampleUniformSpectrum(source.spectrum,w/source.onePlusZ);if(!s.valid)throw new QsoSpectrumError('range');return s.value;});
 return Object.freeze({wavelengths:grid.wavelengths,values:Object.freeze(values),step:grid.step,source});
}
