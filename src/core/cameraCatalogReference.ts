import type {CameraKind} from './cameraInformation';
import type {NomadBand} from './nativeNomadRows';
export type CameraCatalogReference=Readonly<{camera:CameraKind;position:number;filter:string;catalog:'NOMAD'|'USNO-B1';mode:0|1;selector:number;selectedBand:NomadBand|'I';queryBand:NomadBand|'I2';nomadReader:boolean}>;
/** Typed CCD switch0x5223c8 and IR branches0x51dfda.
 * Compiled source lookup only;does not apply a filter or admit a response. */
const ccd:readonly CameraCatalogReference[]=Object.freeze([
 {camera:'ccd',position:0,filter:'NF',catalog:'NOMAD',mode:0,selector:2,selectedBand:'R',queryBand:'R',nomadReader:true},
 {camera:'ccd',position:1,filter:'B',catalog:'NOMAD',mode:0,selector:0,selectedBand:'B',queryBand:'B',nomadReader:true},
 {camera:'ccd',position:2,filter:'V',catalog:'NOMAD',mode:0,selector:1,selectedBand:'V',queryBand:'V',nomadReader:true},
 {camera:'ccd',position:3,filter:'R',catalog:'NOMAD',mode:0,selector:2,selectedBand:'R',queryBand:'R',nomadReader:true},
 {camera:'ccd',position:4,filter:'I',catalog:'USNO-B1',mode:1,selector:2,selectedBand:'I',queryBand:'I2',nomadReader:false},
].map(r=>Object.freeze(r as CameraCatalogReference)));
const ir:readonly CameraCatalogReference[]=Object.freeze((['J','H','K']as const).map((band,i)=>Object.freeze({camera:'ir' as const,position:i,filter:band,catalog:'NOMAD' as const,mode:0 as const,selector:i+3,selectedBand:band,queryBand:band,nomadReader:true})));
export function cameraCatalogReference(kind:unknown,position:unknown):CameraCatalogReference {
 if(kind!=='ccd'&&kind!=='ir')throw new Error('Unsupported camera catalog reference');
 const rows=kind==='ccd'?ccd:ir;
 if(typeof position!=='number'||!Number.isInteger(position)||position<0||position>=rows.length)throw new Error('Unsupported camera filter position');
 return rows[position];
}
/** Reject the original CCD I/USNO-B1 branch;never substitute another magnitude. */
export function nomadBandForCameraFilter(kind:unknown,position:unknown):NomadBand {
 const r=cameraCatalogReference(kind,position);
 if(r.catalog!=='NOMAD'||r.selectedBand==='I')throw new Error('CCD I requires the separate USNO-B1 I2 contract');
 return r.selectedBand;
}
