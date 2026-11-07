import {compiledCameraInformation,type CameraInformation,type CameraKind} from './cameraInformation';
import calibration from '../../docs/CAMERA-SOURCE-CALIBRATION-PROVENANCE.json';
import {parseDelphiFloat,roundHalfEven} from './radioAntenna';
import {delphiFixed} from './variableStars';
import {nativeVal} from './photographicList';
import {compiledCameraQueryReference} from './cameraQueryReference';
import type {OpticalIndex} from './opticalTelescope';
/** Front T7 (analysis/front-plans/front-teacher.md §T7; analysis/front-teacher/t7/RECOVERY.md): the instructor options dialog's
 * CCD Camera and IR Camera tabs. CLEA_VEO.exe 781bc970…c54c, static reading only.
 * - [D] Two 91-byte records (stream fields 74/75 of VEO_OPTS.INI, offsets 8259/8350): CCD at record+0x26e5 (env+0x2d99), IR at
 *   record+0x2740 (env+0x2df4), each laid out as name String[40] +0x00, Singles pixel width +0x29, pixel height +0x2d, read noise
 *   +0x31, dark noise +0x35, base magnitude +0x39, Integers base count +0x3d, base exposure +0x41, bias +0x45, width +0x49,
 *   height +0x4d, A/D bits +0x51, well depth +0x55, Bytes cooling +0x59 (1 = Liquid Nitrogen) and position noise +0x5a.
 * - [D] OKBtnClick 0x5a6068 converts them after SpTimer, inside T6's one try (0x5a6522..0x5a695d): the name through 0x4060cc and
 *   0x403c5c (String[40], cl = 0x28); Singles StrToFloat 0x40cf60 + `fstp dword`; width, height, bias, base count and base exposure
 *   StrToFloat + System.Round 0x403700; well and A/D StrToInt 0x40ad50; cooling := CoolGrp.ItemIndex = 1; position noise :=
 *   NoiseBox.Checked (vmt+0xd8). CCD first (edits +0x460, +0x454, +0x458, +0x470, +0x474, +0x480, +0x484, +0x48c, +0x4a4, +0x4a8,
 *   +0x4ac, +0x4c0, +0x4c4, groups +0x490/+0x4b0), then IR (+0x510, +0x504, +0x508, +0x520, +0x524, +0x528, +0x52c, +0x530,
 *   +0x538, +0x53c, +0x540, +0x54c, +0x550, +0x534/+0x544). An EConvertError (StrToFloat or StrToInt) shows T6's box.
 * - [D] FormActivate 0x5a56e0 (0x5a5b95..0x5a5fae): FloatToStrF ffFixed 18,1 for every Single, IntToStr for every Integer; with
 *   Liquid Nitrogen the CCD tab disables DrkNoiseEd and its label (0x5a5d58..0x5a5d6f), the IR tab disables its whole cooling group
 *   CoolGrp2 (0x5a5f88..0x5a5f92). CoolGrpClick 0x5a6fb0 is the OnClick of both groups but reads only the CCD group and toggles
 *   only the CCD dark-noise edit and label (vmt+0x68 SetEnabled), so the IR dark-noise edit is never disabled.
 * - [D] ADEd/AdEd2 are ReadOnly; the spin buttons step them through StrToInt: CCD down 16→14→12→8 (0x5a6ffc), up 8→12→14→16
 *   (0x5a70b4); IR down 32→16→14→12→8 (0x5a716c), up 8→12→14→16→32 (0x5a7248); any other value is left as it is (texts ' 8',
 *   '12', '14', '16', '32' at 0x5a7098..0x5a7320).
 * - [D] No range is validated anywhere (neither OK nor the cameras): the image allocation 0x524348 GetMem's width × height × 4 bytes
 *   (32-bit product) and only an EOutOfMemory gives "Insufficient memory to create image.  You cannot use the CCD camera!" /
 *   "Not Enough Memory!" (0x524440 / 0x524488, its result is ignored by CCD Go 0x512789); GetMem of a size ≤ 0 returns nil.
 * - [W] WEB-T7-01: the same StrToFloat grammar as T6 (parseDelphiFloat), StrToInt is nativeVal; a Single that overflows or an
 *   Integer outside Int32 gets VIREO's box; a name keeps at most 40 characters and no control characters.
 * Pure: no React, storage or network. */

export type CameraCooling='thermoelectric'|'liquidNitrogen';
/** One camera record as the options hold it (CameraInformation's nine Information fields plus the three base fields and the
 * position-noise flag). */
export type CameraRecord=Readonly<CameraInformation&{baseMagnitude:number;baseCount:number;baseSeconds:number;positionNoise:boolean}>;
export type CameraParameters=Readonly<{ccd:CameraRecord;ir:CameraRecord}>;
export type CameraTextKey='detector'|'pixelWidthMicrons'|'pixelHeightMicrons'|'width'|'height'|'readNoiseElectronsPerPixel'|'darkNoiseElectronsPerPixelSecond'|'biasElectronsPerPixel'|'baseMagnitude'|'baseCount'|'baseSeconds'|'wellDepthElectrons'|'adBits';
export type CameraParameterKey=CameraTextKey|'cooling'|'positionNoise';
type Conversion='name'|'single'|'round'|'strtoint';
export type CameraParameterField=Readonly<{key:CameraTextKey;caption:string;hint:string;offset:string;type:Conversion;
 control:Readonly<Record<CameraKind,string>>;formField:Readonly<Record<CameraKind,string>>;store:Readonly<Record<CameraKind,string>>;display:Readonly<Record<CameraKind,string>>;
 defaults:Readonly<Record<CameraKind,string>>;dfm:Readonly<Record<CameraKind,string>>}>;
const f=(key:CameraTextKey,caption:string,hint:string,offset:string,type:Conversion,ccd:readonly string[],ir:readonly string[]):CameraParameterField=>{
 const pick=(i:number)=>Object.freeze({ccd:ccd[i],ir:ir[i]});
 return Object.freeze({key,caption,hint,offset,type,control:pick(0),formField:pick(1),store:pick(2),display:pick(3),defaults:pick(4),dfm:pick(5)});
};
/** [D] In VIREO's OK order (0x5a6522..0x5a6714 CCD, 0x5a6741..0x5a6933 IR): [control, form field, store, FormActivate SetText,
 * defaults store, DFM file offset of the control name] per camera. Captions are the tab's TLabel captions (DFM), as the read-only
 * rows named them before T7. */
export const CAMERA_PARAMETER_FIELDS:readonly CameraParameterField[]=Object.freeze([
 f('detector','Camera Name/ID','','+0x00','name',['NameEd','+0x460','0x5a655c','0x5a5bae','0x5a2b7b','0x20c760'],['NameEd2','+0x510','0x5a677b','0x5a5dba','0x5a2beb','0x20d64e']),
 f('pixelWidthMicrons','Pixel Size: Width','Pixel Width in Microns (1.0E-6m)','+0x29','single',['WdPixEd','+0x454','0x5a6580','0x5a5bd0','0x5a2b80','0x20c600'],['WdPixEd2','+0x504','0x5a679f','0x5a5de2','0x5a2bf0','0x20d4eb']),
 f('pixelHeightMicrons','Pixel Size: Height','Pixel Height in Microns (1.0E-6m)','+0x2d','single',['HtPixEd','+0x458','0x5a65a3','0x5a5bf2','0x5a2b87','0x20c684'],['HtPixEd2','+0x508','0x5a67c2','0x5a5e0a','0x5a2bf7','0x20d570']),
 f('width','Image Size (Pixels): Width','Image Width in Pixels','+0x49','round',['WdthEd','+0x470','0x5a65cb','0x5a5c0b','0x5a2ba3','0x20c8d0'],['WdthEd2','+0x520','0x5a67ea','0x5a5e29','0x5a2c13','0x20d7c2']),
 f('height','Image Size (Pixels): Height','Image Height in Pixels','+0x4d','round',['HtEd','+0x474','0x5a65f2','0x5a5c24','0x5a2baa','0x20c948'],['HtEd2','+0x524','0x5a6811','0x5a5e48','0x5a2c1a','0x20d83b']),
 f('readNoiseElectronsPerPixel','Read Noise (e/pixel)','','+0x31','single',['RdNoiseEd','+0x480','0x5a6614','0x5a5c46','0x5a2b8e','0x20c9c1'],['RdNoiseEd2','+0x528','0x5a6833','0x5a5e70','0x5a2bfe','0x20d8b5']),
 f('darkNoiseElectronsPerPixelSecond','Dark Noise (e/pixel/sec)','Thermoelectric cooling only.','+0x35','single',['DrkNoiseEd','+0x484','0x5a6637','0x5a5c68','0x5a2b9c','0x20ca21'],['DrkNoiseEd2','+0x52c','0x5a6856','0x5a5e98','0x5a2c0c','0x20d916']),
 f('biasElectronsPerPixel','Bias (e/Pixel)','','+0x45','round',['BiasEd','+0x48c','0x5a665f','0x5a5c87','0x5a2b95','0x20caa5'],['BiasEd2','+0x530','0x5a687e','0x5a5eb7','0x5a2c05','0x20d99b']),
 f('baseMagnitude','Base Magnitude','','+0x39','single',['CCDMagEd','+0x4a4','0x5a6681','0x5a5caf','0x5a2bb1','0x20cba0'],['CCDMagEd2','+0x538','0x5a68a0','0x5a5edf','0x5a2c21','0x20da98']),
 f('baseCount','Base Count','','+0x3d','round',['CCDCountEd','+0x4a8','0x5a66a9','0x5a5cce','0x5a2bb8','0x20cc00'],['CCDCountEd2','+0x53c','0x5a68c8','0x5a5efe','0x5a2c28','0x20daf9']),
 f('baseSeconds','Base Exposure','Exposure in seconds (for base mag and count)','+0x41','round',['CCDTimeEd','+0x4ac','0x5a66d0','0x5a5ced','0x5a2bbf','0x20cc62'],['CCDTimeEd2','+0x540','0x5a68ef','0x5a5f1d','0x5a2c2f','0x20db5c']),
 f('wellDepthElectrons','Chip Well Depth','Electrons','+0x55','strtoint',['WellEd','+0x4c0','0x5a66f2','0x5a5d0c','0x5a2bcd','0x20cf7e'],['WellEd2','+0x54c','0x5a6911','0x5a5f3c','0x5a2c3d','0x20de7c']),
 f('adBits','AD Depth (Bits)','','+0x51','strtoint',['ADEd','+0x4c4','0x5a6714','0x5a5d2b','0x5a2bc6','0x20cfec'],['AdEd2','+0x550','0x5a6933','0x5a5f5b','0x5a2c36','0x20deeb']),
]);
export const CAMERA_TEXT_KEYS=Object.freeze(CAMERA_PARAMETER_FIELDS.map(x=>x.key));
const FIELD=new Map(CAMERA_PARAMETER_FIELDS.map(x=>[x.key,x]));
export const cameraParameterField=(k:CameraTextKey)=>FIELD.get(k)!;
/** [D] The two groups after the edits: cooling (CoolGrp +0x490 / CoolGrp2 +0x534, ItemIndex = 1 → Liquid Nitrogen; store 0x5a672a /
 * 0x5a6949; defaults 0x5a2bd4 = 0 / 0x5a2c44 = 1) and Apply Position Noise (NoiseBox1 +0x4b0 / NoiseBox2 +0x544; store 0x5a673e /
 * 0x5a695d; defaults 0x5a2bd8 / 0x5a2c48 = 1). */
export const CAMERA_GROUP_CAPTIONS=Object.freeze({cooling:'Chip Cooling',thermoelectric:'Thermoelectric',liquidNitrogen:'Liquid Nitrogen',positionNoise:'Apply Position Noise',tab:Object.freeze({ccd:'&CCD Camera',ir:'&IR Camera'})});
export const CAMERA_NAME_MAX=40;
export const CAMERA_PARAMETER_TEXT_MAX=32;

const base=calibration.compiledCCD;
function compiledRecord(kind:CameraKind):CameraRecord{
 // [D] Both compiled records hold base magnitude 10, count 1000, exposure 10 (0x5a2bb1..0x5a2bbf, 0x5a2c21..0x5a2c2f) and
 // position noise 1 (0x5a2bd8, 0x5a2c48).
 return Object.freeze({...compiledCameraInformation(kind),baseMagnitude:base.baseMagnitude,baseCount:base.baseCount,baseSeconds:base.baseSeconds,positionNoise:true});
}
/** [D] The defaults routine 0x5a21d0 (0x5a2b67..0x5a2c48). */
export const COMPILED_CAMERA_PARAMETERS:CameraParameters=Object.freeze({ccd:compiledRecord('ccd'),ir:compiledRecord('ir')});

const single=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&Object.is(Math.fround(v),v)&&!Object.is(v,-0);
const int32=(v:unknown):v is number=>typeof v==='number'&&Number.isInteger(v)&&v>=-0x8000_0000&&v<=0x7fff_ffff&&!Object.is(v,-0);
export const validCameraName=(v:unknown):v is string=>typeof v==='string'&&v.length<=CAMERA_NAME_MAX&&!/[\x00-\x1f\x7f]/.test(v);
export function validCameraValue(k:CameraParameterKey,v:unknown):boolean{
 if(k==='cooling')return v==='thermoelectric'||v==='liquidNitrogen';
 if(k==='positionNoise')return typeof v==='boolean';
 const x=FIELD.get(k);if(!x)return false;
 return x.type==='name'?validCameraName(v):x.type==='single'?single(v):int32(v);
}
const RECORD_KEYS:readonly CameraParameterKey[]=Object.freeze([...CAMERA_TEXT_KEYS,'cooling','positionNoise']);
export function readCameraRecord(kind:CameraKind,value:unknown):CameraRecord{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError('Invalid camera parameters');
 const o=value as Record<string,unknown>;
 // A record read back from a CameraParameters value may carry its own `kind`; a JSON record has none.
 const extra=Object.hasOwn(o,'kind')?(o.kind===kind?1:-1):0;
 if(extra<0||Object.keys(o).length!==RECORD_KEYS.length+extra||!RECORD_KEYS.every(k=>Object.hasOwn(o,k)&&validCameraValue(k,o[k])))throw new TypeError('Invalid camera parameters');
 return Object.freeze({kind,...Object.fromEntries(RECORD_KEYS.map(k=>[k,o[k]]))}) as CameraRecord;
}
/** The JSON shape: {ccd:{…15 fields}, ir:{…}} (no `kind` inside a record). */
export function readCameraParameters(value:unknown):CameraParameters{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError('Invalid camera parameters');
 const o=value as Record<string,unknown>;if(Object.keys(o).length!==2)throw new TypeError('Invalid camera parameters');
 return Object.freeze({ccd:readCameraRecord('ccd',o.ccd),ir:readCameraRecord('ir',o.ir)});
}
/** The serializable form of the parameters (the records without `kind`). */
export const cameraParametersJson=(p:CameraParameters)=>Object.freeze({ccd:Object.fromEntries(RECORD_KEYS.map(k=>[k,p.ccd[k]])),ir:Object.fromEntries(RECORD_KEYS.map(k=>[k,p.ir[k]]))});

/** FormActivate's text for one edit (0x486268 ffFixed 18,1 / IntToStr 0x40ac14 / the name as it is). */
export function cameraParameterText(k:CameraTextKey,v:number|string):string{
 const x=FIELD.get(k);if(!x||!validCameraValue(k,v))throw new TypeError('Invalid camera parameter');
 return x.type==='name'?v as string:x.type==='single'?delphiFixed(v as number,1):String(v);
}
export type CameraDraft=Readonly<{texts:Readonly<Record<CameraTextKey,string>>;liquidNitrogen:boolean;positionNoise:boolean}>;
export type CameraDrafts=Readonly<Record<CameraKind,CameraDraft>>;
export const cameraDraftOf=(r:CameraRecord):CameraDraft=>Object.freeze({texts:Object.freeze(Object.fromEntries(CAMERA_TEXT_KEYS.map(k=>[k,cameraParameterText(k,r[k])])) as Record<CameraTextKey,string>),liquidNitrogen:r.cooling==='liquidNitrogen',positionNoise:r.positionNoise});
export const cameraDraftsOf=(p:CameraParameters):CameraDrafts=>Object.freeze({ccd:cameraDraftOf(p.ccd),ir:cameraDraftOf(p.ir)});

/** One edit's OK conversion; null where VIREO raises EConvertError (or [W] where its store would overflow). */
export function convertCameraText(k:CameraTextKey,text:string):number|string|null{
 const x=FIELD.get(k);if(!x||typeof text!=='string')return null;
 if(x.type==='name'){const s=text.slice(0,CAMERA_NAME_MAX);return validCameraName(s)?s:null;}// 0x403c5c keeps 40 characters
 if(text.length>CAMERA_PARAMETER_TEXT_MAX)return null;
 if(x.type==='strtoint'){const v=nativeVal(text);return v===null?null:v+0;}
 const v=parseDelphiFloat(text);if(v===null)return null;
 const r=x.type==='single'?Math.fround(v):roundHalfEven(v),out=r===0?0:r;
 return validCameraValue(k,out)?out:null;
}
export type CameraParameterOk=Readonly<{ok:true;values:CameraParameters}|{ok:false;kind:CameraKind;key:CameraTextKey}>;
/** OKBtnClick's CCD and IR blocks, in VIREO's order (CCD edits, CCD groups, IR edits, IR groups); the first failure stops it. */
export function applyCameraParameterTexts(drafts:CameraDrafts):CameraParameterOk{
 const out:Partial<Record<CameraKind,CameraRecord>>={};
 for(const kind of ['ccd','ir'] as const){
  const d=drafts[kind],r:Record<string,unknown>={kind};
  for(const x of CAMERA_PARAMETER_FIELDS){const v=convertCameraText(x.key,d.texts[x.key]);if(v===null)return Object.freeze({ok:false,kind,key:x.key});r[x.key]=v;}
  r.cooling=d.liquidNitrogen?'liquidNitrogen':'thermoelectric';r.positionNoise=d.positionNoise;
  out[kind]=Object.freeze(r) as CameraRecord;
 }
 return Object.freeze({ok:true,values:Object.freeze(out as CameraParameters)});
}
/** [D] The spin buttons: StrToInt of the read-only A/D text, then the case table (0x5a7028.., 0x5a70e0.., 0x5a7198.., 0x5a7274..).
 * A value outside the table, or a text StrToInt refuses (VIREO: an uncaught EConvertError, try/finally only), leaves the text. */
const SPIN:Readonly<Record<CameraKind,Readonly<Record<'up'|'down',Readonly<Record<number,string>>>>>>=Object.freeze({
 ccd:Object.freeze({down:Object.freeze({12:' 8',14:'12',16:'14'}),up:Object.freeze({8:'12',12:'14',14:'16'})}),
 ir:Object.freeze({down:Object.freeze({12:' 8',14:'12',16:'14',32:'16'}),up:Object.freeze({8:'12',12:'14',14:'16',16:'32'})}),
});
export function cameraAdSpin(kind:CameraKind,direction:'up'|'down',text:string):string{
 const v=nativeVal(text);return v===null?text:SPIN[kind][direction][v]??text;
}
/** FormActivate's enabled states: the CCD dark-noise edit follows the CCD group (also on every CoolGrpClick of either group); the
 * IR cooling group is disabled when the IR record holds Liquid Nitrogen at activation. */
export const ccdDarkNoiseEnabled=(drafts:CameraDrafts)=>!drafts.ccd.liquidNitrogen;
export const irCoolingEnabled=(activated:CameraParameters)=>activated.ir.cooling!=='liquidNitrogen';

// ---- What each camera's exposure reads ----
/** [D] The fields an exposure reads (docs/CAMERA-PIPELINE-AUTHORITY.md, RECOVERY §3): its own record for the field initialize
 * (0x5220f4 / 0x51dd10: width, height, pixel size, position noise +0x5a), the image allocation (0x5214c8 / 0x51e3b8) and the final
 * well and A/D (0x521b3b / 0x51e60a); the CCD record for the background (0x5215e4..0x52164b, IR 0x51e45f: read and dark noise,
 * cooling, bias), the shared source initializer (0x52455c: pixel size) and the point/extended calibration (0x5245e7 / 0x524ae9:
 * base magnitude, count, exposure). The name is read only by Information (0x512d5a / 0x514d8a) and the native FITS header
 * (0x523d2d / 0x523e3b), and the IR record's noise, bias, cooling and base fields only by Information and the options dialog. */
export type CameraUse=Readonly<{camera:CameraKind;key:CameraParameterKey}>;
const OWN:readonly CameraParameterKey[]=Object.freeze(['pixelWidthMicrons','pixelHeightMicrons','width','height','wellDepthElectrons','adBits','positionNoise']);
const SHARED:readonly CameraParameterKey[]=Object.freeze(['readNoiseElectronsPerPixel','darkNoiseElectronsPerPixelSecond','biasElectronsPerPixel','cooling','baseMagnitude','baseCount','baseSeconds','pixelWidthMicrons','pixelHeightMicrons']);
export function cameraExposureUses(kind:CameraKind):readonly CameraUse[]{
 const own=OWN.map(key=>({camera:kind,key})),ccd=SHARED.map(key=>({camera:'ccd' as const,key}));
 const seen=new Set<string>(),out:CameraUse[]=[];
 for(const u of [...own,...ccd]){const id=u.camera+'.'+u.key;if(!seen.has(id)){seen.add(id);out.push(Object.freeze(u));}}
 return Object.freeze(out);
}
const same=(a:unknown,b:unknown)=>Object.is(a,b);
/** Every field (of both records) that differs from the compiled value. */
export function uncertifiedCameraFields(p:CameraParameters):readonly CameraUse[]{
 const out:CameraUse[]=[];
 for(const camera of ['ccd','ir'] as const)for(const key of RECORD_KEYS)if(!same(p[camera][key],COMPILED_CAMERA_PARAMETERS[camera][key]))out.push(Object.freeze({camera,key}));
 return Object.freeze(out);
}
export const isCompiledCameraParameters=(p:CameraParameters)=>uncertifiedCameraFields(p).length===0;
export const sameCameraParameters=(a:CameraParameters,b:CameraParameters)=>(['ccd','ir'] as const).every(c=>RECORD_KEYS.every(k=>same(a[c][k],b[c][k])));
/** The fields of an exposure of `kind` that differ from the compiled ones (empty: the exposure is the certified compiled one). */
export function uncertifiedExposureFields(p:CameraParameters,kind:CameraKind):readonly CameraUse[]{
 return Object.freeze(cameraExposureUses(kind).filter(u=>!same(p[u.camera][u.key],COMPILED_CAMERA_PARAMETERS[u.camera][u.key])));
}
/** Review-friendly label, `<tab> › <caption>` as the dialog shows it. */
export function cameraParameterLabel(u:CameraUse):string{
 const tab=u.camera==='ccd'?'CCD Camera':'IR Camera',caption=u.key==='cooling'?CAMERA_GROUP_CAPTIONS.cooling:u.key==='positionNoise'?CAMERA_GROUP_CAPTIONS.positionNoise:FIELD.get(u.key)!.caption;
 return `${tab} › ${caption}`;
}
/** The value as the label shows it (the dialog's text). */
export function cameraParameterValueText(p:CameraParameters,u:CameraUse):string{
 const v=p[u.camera][u.key];
 if(u.key==='cooling')return v==='liquidNitrogen'?CAMERA_GROUP_CAPTIONS.liquidNitrogen:CAMERA_GROUP_CAPTIONS.thermoelectric;
 if(u.key==='positionNoise')return v?'on':'off';
 return cameraParameterText(u.key,v as number|string);
}

/** [W] WEB-T7-02: the domain the web measures with an uncertified camera record. VIREO validates nothing (RECOVERY §2): a size
 * whose 32-bit byte count GetMem cannot allocate gives its memory box, a zero size a nil plane, a zero base exposure or pixel size a
 * zero divide (EZeroDivide/EInvalidOp under control word 0x1332 [I]), and a negative background mean an EInvalidOp in FSQRT [I].
 * The web measures image sizes 1..1024 per axis (the compiled CCD's 1024² is the largest plane the composer, the Saved images
 * viewer and its FITS reader admit; docs/CAMERA-DEFAULT-SIZE.md), pixel sizes in (0, 1000] µm, read and dark noise ≥ 0,
 * |base magnitude| ≤ 100, base count ≥ 1, base exposure ≥ 1 s, well depth ≥ 1 and A/D 1..32 bits, and a search radius of at most
 * 1° (cameraStartRefusal, review 1 M1); anything else is refused with its field. A value inside this domain that still leaves an admission bound of a stage (Float32 or safe-integer moments, the PSF width,
 * a peak beyond 1e12) refuses the exposure as `parameters` instead of making it. */
export const CAMERA_PARAMETER_DOMAIN=Object.freeze({maximumImageAxis:1024,maximumPixelMicrons:1000,maximumMagnitude:100,minimumBaseCount:1,minimumBaseSeconds:1,minimumWell:1,minimumAdBits:1,maximumAdBits:32});
export function cameraParameterRefusal(p:CameraParameters,kind:CameraKind):CameraUse|null{
 const d=CAMERA_PARAMETER_DOMAIN;
 for(const u of cameraExposureUses(kind)){
  const v=p[u.camera][u.key];
  if(typeof v!=='number')continue;
  const bad=u.key==='width'||u.key==='height'?v<1||v>d.maximumImageAxis
   :u.key==='pixelWidthMicrons'||u.key==='pixelHeightMicrons'?!(v>0)||v>d.maximumPixelMicrons
   :u.key==='readNoiseElectronsPerPixel'||u.key==='darkNoiseElectronsPerPixelSecond'?v<0
   :u.key==='baseMagnitude'?Math.abs(v)>d.maximumMagnitude
   :u.key==='baseCount'?v<d.minimumBaseCount
   :u.key==='baseSeconds'?v<d.minimumBaseSeconds
   :u.key==='wellDepthElectrons'?v<d.minimumWell
   :u.key==='adBits'?v<d.minimumAdBits||v>d.maximumAdBits:false;
  if(bad)return u;
 }
 return null;
}
/** Review 1 nit: a refused value as stored (shortest binary64 spelling), so a Single such as 1000.04 shows why it is out of range. */
export function cameraParameterExactText(p:CameraParameters,u:CameraUse):string{
 const v=p[u.camera][u.key];return typeof v==='number'?String(v):cameraParameterValueText(p,u);
}
/** [W] WEB-T7-02, review 1 M1: the largest search radius the camera asks for. VizieR cone searches are built for at most 1°
 * (vizierConeUrl), and every compiled camera asks for at most 0.23°. */
export const CAMERA_MAXIMUM_SEARCH_RADIUS_DEGREES=1;
/** Start-time refusal: the measured domain, then the search radius that the nominal field gives on this telescope (1.5 × half
 * the larger side, 0x52236a / 0x51df89). Above 1° the field of the larger side is named: its pixel size when that differs from
 * the compiled one, else its image size. */
export function cameraStartRefusal(p:CameraParameters,kind:CameraKind,index:OpticalIndex):CameraUse|null{
 const domain=cameraParameterRefusal(p,kind);if(domain)return domain;
 const r=compiledCameraQueryReference(kind,index,0,{centerRAHours:0,centerDecDegrees:0,selectionMagnitudeLimit:21.5,suppliedDateDouble:2451545,dateBias:0},p);
 if(r.searchRadiusDegrees<=CAMERA_MAXIMUM_SEARCH_RADIUS_DEGREES)return null;
 const own=p[kind],c=COMPILED_CAMERA_PARAMETERS[kind],wide=own.width*own.pixelWidthMicrons>=own.height*own.pixelHeightMicrons;
 const pixel=wide?'pixelWidthMicrons':'pixelHeightMicrons',size=wide?'width':'height';
 return Object.freeze({camera:kind,key:!Object.is(own[pixel],c[pixel])?pixel:size});
}
/** The records an exposure of `kind` composes with: null for the compiled values, so every compiled recipe, FITS file and draw
 * count stays byte-identical (no field is added to the recipe). */
export function exposureCameraParameters(p:CameraParameters,kind:CameraKind):CameraParameters|null{
 return uncertifiedExposureFields(p,kind).length===0?null:p;
}

/** [D] One 91-byte record of a native VEO_OPTS.INI (BlockRead stores it as it lies in memory, little-endian). The name is the
 * ShortString's length byte (at most 40 used) and Latin-1 characters [W: VIREO's ANSI code page]; a Single that is NaN or ±Inf, a
 * name with control characters or a cooling / noise byte other than 0 or 1 keeps the compiled field (reported as not representable;
 * VIREO tests the bytes against 0, so any non-zero byte is "on" there [D], the web reads 1 only). */
export const NATIVE_CAMERA_RECORD_BYTES=91;
export function readNativeCameraRecord(kind:CameraKind,bytes:Uint8Array,at:number):Readonly<{record:CameraRecord;representable:boolean}>{
 if(at<0||at+NATIVE_CAMERA_RECORD_BYTES>bytes.length)throw new RangeError('Native camera record out of range');
 const view=new DataView(bytes.buffer,bytes.byteOffset+at,NATIVE_CAMERA_RECORD_BYTES),c=COMPILED_CAMERA_PARAMETERS[kind];let representable=true;
 // Review 1 L3: a length byte above 40 cannot come from String[40]; it is not representable and keeps the compiled name.
 const length=bytes[at]!;let name='';for(let i=1;i<=Math.min(length,CAMERA_NAME_MAX);i++)name+=String.fromCharCode(bytes[at+i]!);
 if(length>CAMERA_NAME_MAX||!validCameraName(name)){representable=false;name=c.detector;}
 const s=(o:number,fallback:number)=>{const v=view.getFloat32(o,true);if(!Number.isFinite(v)){representable=false;return fallback;}return v+0;};
 const i=(o:number)=>view.getInt32(o,true)+0;
 const flag=(o:number,fallback:boolean)=>{const b=view.getUint8(o);if(b>1){representable=false;return fallback;}return b===1;};
 const record=readCameraRecord(kind,{detector:name,pixelWidthMicrons:s(0x29,c.pixelWidthMicrons),pixelHeightMicrons:s(0x2d,c.pixelHeightMicrons),
  readNoiseElectronsPerPixel:s(0x31,c.readNoiseElectronsPerPixel),darkNoiseElectronsPerPixelSecond:s(0x35,c.darkNoiseElectronsPerPixelSecond),baseMagnitude:s(0x39,c.baseMagnitude),
  baseCount:i(0x3d),baseSeconds:i(0x41),biasElectronsPerPixel:i(0x45),width:i(0x49),height:i(0x4d),adBits:i(0x51),wellDepthElectrons:i(0x55),
  cooling:flag(0x59,c.cooling==='liquidNitrogen')?'liquidNitrogen':'thermoelectric',positionNoise:flag(0x5a,c.positionNoise)});
 return Object.freeze({record,representable});
}
