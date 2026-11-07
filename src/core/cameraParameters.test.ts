import {describe,expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {CAMERA_PARAMETER_FIELDS,CAMERA_TEXT_KEYS,COMPILED_CAMERA_PARAMETERS,applyCameraParameterTexts,cameraAdSpin,cameraDraftsOf,cameraExposureUses,cameraParameterLabel,cameraParameterRefusal,
 ccdDarkNoiseEnabled,convertCameraText,cameraStartRefusal,cameraParameterExactText,CAMERA_MAXIMUM_SEARCH_RADIUS_DEGREES,exposureCameraParameters,irCoolingEnabled,isCompiledCameraParameters,readCameraParameters,cameraParametersJson,readNativeCameraRecord,sameCameraParameters,
 uncertifiedCameraFields,uncertifiedExposureFields,type CameraParameters,type CameraRecord} from './cameraParameters';
import {compiledCameraInformation,cameraInformationLines} from './cameraInformation';
import {composeCameraExposure,CameraExposureError,CAMERA_PARAMETERS_ADAPTATION,type CameraExposureRecipe} from './cameraExposure';
import {readVizierCatalog,selectVizierCatalog,wholeSkySelection} from './vizierNomad';
import {compiledCameraProjection} from './cameraProjection';
import {compiledCameraSourceCalibration,CAMERA_SOURCE_ADMISSION} from './cameraSourceCalibration';
import {compiledCameraQueryReference} from './cameraQueryReference';
import {cameraPreparationReference} from './cameraPreparation';
import {overlayStretch} from './cameraOverlaySource';
import {writeCameraFits,cameraFitsCards,isUncertifiedCameraFits,type CameraFitsContext} from './fitsWriter';
import {findCameraExtract,CAMERA_EXTRACTS} from '../io/cameraCatalog';
import {handleCameraWorkerRequest} from '../camera/cameraWorkerCore';
import controls from './cameraExposure.controls.json';

// Front T7 contracts (analysis/front-teacher/t7/RECOVERY.md). CLEA_VEO.exe 781bc970…c54c, static only. These test the port against
// that reading; the changed-value images are web contracts (seeded draws), not native oracles.
const recorded=new Uint8Array(readFileSync(new URL('../../tests/fixtures/vizier/nomad-56.75+24.12-r0.01.xml',import.meta.url)));
const selection=()=>selectVizierCatalog(readVizierCatalog(recorded,{catalog:'I/297',band:'R',epochOffsetYears:0,queryBrightMagnitude:1,queryFaintMagnitude:21.5}),wholeSkySelection(21.5));
const recipe:CameraExposureRecipe={camera:'ccd',opticalIndex:0,filterPosition:0,seconds:10,gain:2,centerRaHours:56.745/15,centerDecDegrees:24.118,seed:20261027};
const sha=(px:readonly number[])=>{const b=Buffer.alloc(px.length*4);px.forEach((v,i)=>b.writeFloatBE(v,i*4));return createHash('sha256').update(b).digest('hex');};
const C=COMPILED_CAMERA_PARAMETERS;
const withRecord=(kind:'ccd'|'ir',change:Partial<CameraRecord>):CameraParameters=>Object.freeze({...C,[kind]:Object.freeze({...C[kind],...change})});
const mean=(px:readonly number[])=>px.reduce((s,v)=>s+v,0)/px.length;

describe('T7 field map (OKBtnClick 0x5a6522..0x5a695d, FormActivate 0x5a5b95..0x5a5fae, defaults 0x5a2b67..0x5a2c48)',()=>{
 test('the 13 edits in VIREO\'s OK order, record offsets and conversions',()=>{
  expect(CAMERA_TEXT_KEYS).toEqual(['detector','pixelWidthMicrons','pixelHeightMicrons','width','height','readNoiseElectronsPerPixel','darkNoiseElectronsPerPixelSecond','biasElectronsPerPixel','baseMagnitude','baseCount','baseSeconds','wellDepthElectrons','adBits']);
  expect(CAMERA_PARAMETER_FIELDS.map(f=>[f.offset,f.type])).toEqual([['+0x00','name'],['+0x29','single'],['+0x2d','single'],['+0x49','round'],['+0x4d','round'],['+0x31','single'],['+0x35','single'],['+0x45','round'],['+0x39','single'],['+0x3d','round'],['+0x41','round'],['+0x55','strtoint'],['+0x51','strtoint']]);
  expect(CAMERA_PARAMETER_FIELDS.map(f=>f.formField.ccd)).toEqual(['+0x460','+0x454','+0x458','+0x470','+0x474','+0x480','+0x484','+0x48c','+0x4a4','+0x4a8','+0x4ac','+0x4c0','+0x4c4']);
  expect(CAMERA_PARAMETER_FIELDS.map(f=>f.formField.ir)).toEqual(['+0x510','+0x504','+0x508','+0x520','+0x524','+0x528','+0x52c','+0x530','+0x538','+0x53c','+0x540','+0x54c','+0x550']);
  // Stores ascend in the order OK runs them.
  for(const k of ['ccd','ir'] as const){const s=CAMERA_PARAMETER_FIELDS.map(f=>parseInt(f.store[k],16));expect([...s].sort((a,b)=>a-b)).toEqual(s);}
 });
 test('compiled records are the Information records plus base 10 / 1000 / 10 s and position noise on; FormActivate texts',()=>{
  for(const k of ['ccd','ir'] as const)expect(C[k]).toMatchObject({...compiledCameraInformation(k),baseMagnitude:10,baseCount:1000,baseSeconds:10,positionNoise:true});
  const d=cameraDraftsOf(C);
  expect(d.ccd.texts).toEqual({detector:'Site CH350 003B Back-Illuminated',pixelWidthMicrons:'24.0',pixelHeightMicrons:'24.0',width:'1024',height:'1024',readNoiseElectronsPerPixel:'5.0',darkNoiseElectronsPerPixelSecond:'2.0',biasElectronsPerPixel:'1000',baseMagnitude:'10.0',baseCount:'1000',baseSeconds:'10',wellDepthElectrons:'320000',adBits:'16'});
  expect(d.ir.texts).toMatchObject({detector:'CLEA_IR1',pixelWidthMicrons:'40.0',width:'512',readNoiseElectronsPerPixel:'53.0',darkNoiseElectronsPerPixelSecond:'0.7',wellDepthElectrons:'250000',adBits:'32'});
  expect([d.ccd.liquidNitrogen,d.ir.liquidNitrogen,d.ccd.positionNoise,d.ir.positionNoise]).toEqual([false,true,true,true]);
  // Reopening and OK again stores the same values (the IR dark noise Single 0x3f333333 displays and converts back to itself).
  const again=applyCameraParameterTexts(d);expect(again.ok&&sameCameraParameters(again.values,C)).toBe(true);expect(isCompiledCameraParameters(C)).toBe(true);
 });
 test('OK conversion: StrToFloat + Single / Round half-even, StrToInt (nativeVal), the name to 40 characters; the first failure stops',()=>{
  expect(convertCameraText('width','1024.5')).toBe(1024);expect(convertCameraText('width','1025.5')).toBe(1026);expect(convertCameraText('readNoiseElectronsPerPixel','0.1')).toBe(Math.fround(.1));
  expect(convertCameraText('wellDepthElectrons','320000.0')).toBeNull();expect(convertCameraText('wellDepthElectrons',' 320000')).toBe(320000);expect(convertCameraText('adBits','$10')).toBe(16);
  expect(convertCameraText('biasElectronsPerPixel','3e9')).toBeNull();expect(convertCameraText('pixelWidthMicrons','1e39')).toBeNull();expect(convertCameraText('readNoiseElectronsPerPixel','five')).toBeNull();
  expect(convertCameraText('detector','x'.repeat(50))).toBe('x'.repeat(40));expect(convertCameraText('detector','a\tb')).toBeNull();
  const d=cameraDraftsOf(C),bad={ccd:{...d.ccd,texts:{...d.ccd.texts,baseCount:'many'}},ir:{...d.ir,texts:{...d.ir.texts,width:'wide'}}};
  expect(applyCameraParameterTexts(bad)).toEqual({ok:false,kind:'ccd',key:'baseCount'});
  expect(applyCameraParameterTexts({...bad,ccd:d.ccd})).toEqual({ok:false,kind:'ir',key:'width'});
  const r=applyCameraParameterTexts({ccd:{texts:{...d.ccd.texts,biasElectronsPerPixel:'2000'},liquidNitrogen:true,positionNoise:false},ir:d.ir});
  expect(r.ok&&r.values.ccd).toMatchObject({biasElectronsPerPixel:2000,cooling:'liquidNitrogen',positionNoise:false});
 });
 test('A/D spin buttons (0x5a6ffc, 0x5a70b4, 0x5a716c, 0x5a7248) and the enabled states (0x5a5d42, 0x5a5f72, 0x5a6fb0)',()=>{
  const walk=(k:'ccd'|'ir',dir:'up'|'down',from:string)=>{const out=[from];for(let i=0;i<5;i++)out.push(cameraAdSpin(k,dir,out.at(-1)!));return out;};
  expect(walk('ccd','down','16')).toEqual(['16','14','12',' 8',' 8',' 8']);expect(walk('ccd','up',' 8')).toEqual([' 8','12','14','16','16','16']);
  expect(walk('ir','down','32')).toEqual(['32','16','14','12',' 8',' 8']);expect(walk('ir','up','8')).toEqual(['8','12','14','16','32','32']);
  expect(cameraAdSpin('ccd','up','32')).toBe('32');expect(cameraAdSpin('ccd','up','10')).toBe('10');expect(cameraAdSpin('ir','up','x')).toBe('x');
  const d=cameraDraftsOf(C);expect(ccdDarkNoiseEnabled(d)).toBe(true);expect(ccdDarkNoiseEnabled({...d,ccd:{...d.ccd,liquidNitrogen:true}})).toBe(false);
  expect(irCoolingEnabled(C)).toBe(false);expect(irCoolingEnabled(withRecord('ir',{cooling:'thermoelectric'}))).toBe(true);
 });
});

describe('T7 what each exposure reads, and the uncertified typing',()=>{
 test('CCD reads its own record; IR reads its own geometry, well, A/D and noise flag, and the CCD noise, bias, cooling, base and pixel size',()=>{
  const ir=cameraExposureUses('ir').map(u=>`${u.camera}.${u.key}`);
  expect(ir).toEqual(['ir.pixelWidthMicrons','ir.pixelHeightMicrons','ir.width','ir.height','ir.wellDepthElectrons','ir.adBits','ir.positionNoise','ccd.readNoiseElectronsPerPixel','ccd.darkNoiseElectronsPerPixelSecond','ccd.biasElectronsPerPixel','ccd.cooling','ccd.baseMagnitude','ccd.baseCount','ccd.baseSeconds','ccd.pixelWidthMicrons','ccd.pixelHeightMicrons']);
  expect(cameraExposureUses('ccd').every(u=>u.camera==='ccd')).toBe(true);expect(cameraExposureUses('ccd').map(u=>u.key)).not.toContain('detector');
  const irNoise=withRecord('ir',{readNoiseElectronsPerPixel:Math.fround(99),detector:'Other'});
  expect(uncertifiedCameraFields(irNoise).map(cameraParameterLabel)).toEqual(['IR Camera › Camera Name/ID','IR Camera › Read Noise (e/pixel)']);
  expect(exposureCameraParameters(irNoise,'ir')).toBeNull();expect(exposureCameraParameters(irNoise,'ccd')).toBeNull();
  const ccdBias=withRecord('ccd',{biasElectronsPerPixel:2000});
  expect(uncertifiedExposureFields(ccdBias,'ir').map(cameraParameterLabel)).toEqual(['CCD Camera › Bias (e/Pixel)']);expect(exposureCameraParameters(ccdBias,'ir')).toBe(ccdBias);
  expect(exposureCameraParameters(C,'ccd')).toBeNull();expect(exposureCameraParameters(C,'ir')).toBeNull();
 });
 test('[W] measured domain: sizes 1..1024, pixel (0, 1000] µm, noise ≥ 0, base count / exposure ≥ 1, A/D 1..32',()=>{
  const r=(p:CameraParameters,k:'ccd'|'ir'='ccd')=>{const u=cameraParameterRefusal(p,k);return u&&`${u.camera}.${u.key}`;};
  expect(r(C)).toBeNull();expect(r(withRecord('ccd',{width:1024,height:1}))).toBeNull();
  expect(r(withRecord('ccd',{width:1025}))).toBe('ccd.width');expect(r(withRecord('ccd',{height:0}))).toBe('ccd.height');
  expect(r(withRecord('ccd',{pixelWidthMicrons:0}))).toBe('ccd.pixelWidthMicrons');expect(r(withRecord('ccd',{readNoiseElectronsPerPixel:-1}))).toBe('ccd.readNoiseElectronsPerPixel');
  expect(r(withRecord('ccd',{baseSeconds:0}))).toBe('ccd.baseSeconds');expect(r(withRecord('ccd',{adBits:33}))).toBe('ccd.adBits');
  expect(r(withRecord('ir',{width:2048}),'ir')).toBe('ir.width');expect(r(withRecord('ir',{width:2048}),'ccd')).toBeNull();
  expect(()=>composeCameraExposure({...recipe,parameters:withRecord('ccd',{width:2048})},selection())).toThrow(CameraExposureError);
  try{composeCameraExposure({...recipe,parameters:withRecord('ccd',{width:2048})},selection());}catch(e){expect((e as CameraExposureError).code).toBe('parameters');}
 });
});

describe('T7 the composer with instructor records',()=>{
 test('compiled records are byte-identical: no parameters field, the pinned control hash',()=>{
  const plain=composeCameraExposure(recipe,selection()),same=composeCameraExposure({...recipe,parameters:C},selection());
  expect(same.recipe).toEqual(plain.recipe);expect(Object.hasOwn(same.recipe,'parameters')).toBe(false);
  expect({sha256:sha(same.plane.pixels),draws:same.drawsConsumed,finalState:same.finalRandomState,records:same.records.length}).toEqual(controls.cases['nf-catalog']);
  expect(same.adaptations).toBe(plain.adaptations);
  // A changed IR-only field is not read by a CCD exposure, so it composes the compiled image too.
  const irOnly=composeCameraExposure({...recipe,parameters:withRecord('ir',{biasElectronsPerPixel:5})},selection());expect(sha(irOnly.plane.pixels)).toBe(controls.cases['nf-catalog'].sha256);
 });
 test('bias, read noise and cooling move the background as 0x5215e4..0x52164b does (b = read + t·dark unless Liquid Nitrogen)',()=>{
  const empty=selectVizierCatalog(readVizierCatalog(recorded,{catalog:'I/297',band:'R',epochOffsetYears:0,queryBrightMagnitude:1,queryFaintMagnitude:21.5}),wholeSkySelection(-30));
  const g1={...recipe,gain:1},base=composeCameraExposure(g1,empty),m0=mean(base.plane.pixels);
  expect(m0).toBeCloseTo(1000+5+10*2,1);// bias + read + t × dark
  const bias=composeCameraExposure({...g1,parameters:withRecord('ccd',{biasElectronsPerPixel:3000})},empty);
  expect(mean(bias.plane.pixels)-m0).toBeCloseTo(2000,1);expect(bias.drawsConsumed).toBe(base.drawsConsumed);
  expect(bias.recipe.parameters?.ccd.biasElectronsPerPixel).toBe(3000);expect(bias.adaptations).toContain(CAMERA_PARAMETERS_ADAPTATION);
  const read=composeCameraExposure({...g1,parameters:withRecord('ccd',{readNoiseElectronsPerPixel:105})},empty);expect(mean(read.plane.pixels)-m0).toBeCloseTo(100,0);
  const ln=composeCameraExposure({...g1,parameters:withRecord('ccd',{cooling:'liquidNitrogen'})},empty);expect(mean(ln.plane.pixels)).toBeCloseTo(1005,1);
  // The IR camera reads the CCD record's background fields (0x51e45f).
  const ir={...g1,camera:'ir' as const},irBase=composeCameraExposure(ir,empty),irBias=composeCameraExposure({...ir,parameters:withRecord('ccd',{biasElectronsPerPixel:3000})},empty);
  expect(mean(irBias.plane.pixels)-mean(irBase.plane.pixels)).toBeCloseTo(2000,1);
 });
 test('image size, well and A/D: the plane is width × height, clipped at the well, then 2^AD (0x521b3b..)',()=>{
  const empty=selectVizierCatalog(readVizierCatalog(recorded,{catalog:'I/297',band:'R',epochOffsetYears:0,queryBrightMagnitude:1,queryFaintMagnitude:21.5}),wholeSkySelection(-30));
  const small=composeCameraExposure({...recipe,parameters:withRecord('ccd',{width:256,height:128})},empty);
  expect([small.plane.width,small.plane.height,small.plane.pixels.length,small.drawsConsumed]).toEqual([256,128,256*128,256*128]);
  const well=composeCameraExposure({...recipe,gain:1,parameters:withRecord('ccd',{width:64,height:64,wellDepthElectrons:1010})},empty);expect(Math.max(...well.plane.pixels)).toBe(1010);
  const ad=composeCameraExposure({...recipe,gain:1,parameters:withRecord('ccd',{width:64,height:64,adBits:8})},empty);expect(Math.max(...ad.plane.pixels)).toBe(256);
 });
 test('pixel size, position noise and the base record reach the projection and calibration',()=>{
  const center={raHours:recipe.centerRaHours,decDegrees:recipe.centerDecDegrees};
  const p=withRecord('ccd',{pixelWidthMicrons:12,pixelHeightMicrons:12,positionNoise:false});
  const a=compiledCameraProjection('ccd',0,center,true),b=compiledCameraProjection('ccd',0,center,false,p.ccd);
  expect(b.halfX).toBeCloseTo(a.halfX/2,15);expect(b.seeingWidthRadians).toBe(0);
  const c0=compiledCameraSourceCalibration('ccd',0,2,20,12),c1=compiledCameraSourceCalibration('ccd',0,2,20,12,CAMERA_SOURCE_ADMISSION,withRecord('ccd',{baseMagnitude:11,baseCount:2000,baseSeconds:20}));
  expect(c1.referencePeak/c0.referencePeak).toBeCloseTo(2*Math.pow(10,.4),10);expect(c1.exposureScale).toBe(c0.exposureScale/2);
  // The IR calibration uses the CCD record's pixel size (0x52455c).
  const i0=compiledCameraSourceCalibration('ir',0,0,20,12),i1=compiledCameraSourceCalibration('ir',0,0,20,12,CAMERA_SOURCE_ADMISSION,withRecord('ccd',{pixelWidthMicrons:12}));
  expect(i1.sigmaX).toBeCloseTo(2*i0.sigmaX,12);
 });
 test('review 1 M1: a search radius above 1° refuses the Start, naming the field of the larger side (110 µm, 0.4 m: 1.05°)',()=>{
  const ctx={centerRAHours:0,centerDecDegrees:0,selectionMagnitudeLimit:21.5,suppliedDateDouble:2451545,dateBias:0};
  const p=withRecord('ccd',{pixelWidthMicrons:110,pixelHeightMicrons:110});
  expect(cameraParameterRefusal(p,'ccd')).toBeNull();
  expect(compiledCameraQueryReference('ccd',0,0,ctx,p).searchRadiusDegrees).toBeGreaterThan(CAMERA_MAXIMUM_SEARCH_RADIUS_DEGREES);
  expect(cameraStartRefusal(p,'ccd',0)).toEqual({camera:'ccd',key:'pixelWidthMicrons'});
  // The same pixel fits the longer focal lengths of the 0.9 m and 4 m; an image size alone names the size.
  expect(cameraStartRefusal(p,'ccd',2)).toBeNull();
  expect(cameraStartRefusal(withRecord('ir',{width:1024,height:1024,pixelWidthMicrons:200}),'ir',0)).toEqual({camera:'ir',key:'pixelWidthMicrons'});
  expect(cameraStartRefusal(withRecord('ccd',{height:1024,width:1024,pixelWidthMicrons:24}),'ccd',0)).toBeNull();
  expect(cameraStartRefusal(withRecord('ccd',{width:2048}),'ccd',0)).toEqual({camera:'ccd',key:'width'});
  for(const k of ['ccd','ir'] as const)for(const i of [0,1,2] as const)expect(cameraStartRefusal(C,k,i)).toBeNull();
  // Closure check (lower bound): 16 × 16 px at 24 µm on the 0.4 m is a 0.0036° radius, which SR's 2 decimals cannot ask live.
  const tiny=withRecord('ccd',{width:16,height:16});
  expect(cameraStartRefusal(tiny,'ccd',0)).toBeNull();
  expect(cameraStartRefusal(tiny,'ccd',0,true)).toEqual({camera:'ccd',key:'width'});
  for(const k of ['ccd','ir'] as const)for(const i of [0,1,2] as const)expect(cameraStartRefusal(C,k,i,true)).toBeNull();
  // Review 1 nit: the refused value shows its stored spelling.
  const big=withRecord('ccd',{pixelWidthMicrons:Math.fround(1000.04)});expect(cameraParameterExactText(big,{camera:'ccd',key:'pixelWidthMicrons'})).toBe(String(Math.fround(1000.04)));
 });
 test('a value inside the domain that a stage cannot hold refuses as `parameters`, and the worker reports it',()=>{
  const huge=withRecord('ccd',{readNoiseElectronsPerPixel:Math.fround(1e9)});
  expect(()=>composeCameraExposure({...recipe,parameters:huge},selection())).toThrow(expect.objectContaining({code:'parameters'}));
  const state={selection:selection()};
  expect(handleCameraWorkerRequest(state,{type:'compose',recipe:{...recipe,parameters:huge},extras:[]}).reply).toEqual({type:'composed',ok:false,code:'parameters'});
 });
});

describe('T7 query radius, extracts, overlay, FITS and Information',()=>{
 test('the search radius follows the nominal field (0x53df24): 512² halves it; an IR 1024² field leaves every bundled 0.25° extract',()=>{
  const ctx={centerRAHours:recipe.centerRaHours,centerDecDegrees:recipe.centerDecDegrees,selectionMagnitudeLimit:21.5,suppliedDateDouble:2451545,dateBias:0};
  const r0=compiledCameraQueryReference('ccd',0,0,ctx),r1=compiledCameraQueryReference('ccd',0,0,ctx,withRecord('ccd',{width:512,height:512}));
  expect(r0.searchRadiusDegrees.toFixed(2)).toBe('0.23');expect(r1.searchRadiusDegrees.toFixed(2)).toBe('0.11');
  expect(cameraPreparationReference('ccd',0,withRecord('ccd',{width:512,height:512})).widthArcminutes).toBe(Math.fround(cameraPreparationReference('ccd',0).widthArcminutes/2));
  const e=CAMERA_EXTRACTS.find(x=>x.catalog==='I/297')!,q=(radiusDegrees:number)=>findCameraExtract({catalog:'I/297',raHours:e.raDegrees/15,decDegrees:e.decDegrees,radiusDegrees});
  const ir=compiledCameraQueryReference('ir',0,0,ctx,withRecord('ir',{width:1024,height:1024}));
  expect(ir.searchRadiusDegrees).toBeGreaterThan(.25);expect(q(ir.searchRadiusDegrees)).toBeNull();expect(q(compiledCameraQueryReference('ir',0,0,ctx).searchRadiusDegrees)).not.toBeNull();
 });
 test('the overlay stretch follows the plane size; the compiled call is unchanged',()=>{
  const red=Uint8Array.from({length:936*936},(_,i)=>i%251),rect={left:300,top:300,width:300,height:300,exactWidth:300,exactHeight:300};
  expect(overlayStretch(red,rect,1024,1024)).toEqual(overlayStretch(red,rect));
  const s=overlayStretch(red,rect,64,32);expect(s.length).toBe(64*32);expect(s[63]).toBe(255);expect(s[31*64]).toBe(255);expect(s[0]).toBe(red[(300+Math.floor(.5*300/31))*936+300+Math.floor(.5*300/63)]);
 });
 test('FITS: compiled files are unchanged; an instructor exposure lists its values in COMMENT cards (uncertified-parameter)',()=>{
  const context:CameraFitsContext={jd:2455000.5,filterName:'NF',catalogName:'NOMAD',source:{mode:'static',sha256:'0'.repeat(64),extractId:null,url:'https://vizier.idia.ac.za/x'}};
  const plain=composeCameraExposure(recipe,selection()),same=composeCameraExposure({...recipe,parameters:C},selection());
  expect(createHash('sha256').update(writeCameraFits(same,context)).digest('hex')).toBe(createHash('sha256').update(writeCameraFits(plain,context)).digest('hex'));
  expect(cameraFitsCards(plain,context).some(c=>c.includes('uncertified'))).toBe(false);
  const x=composeCameraExposure({...recipe,parameters:withRecord('ccd',{biasElectronsPerPixel:2000,width:512,height:512})},selection());
  const cards=cameraFitsCards(x,context);
  expect(cards).toContain('COMMENT uncertified-parameter: instructor camera values (not compiled):'.padEnd(80));
  expect(cards.some(c=>c.startsWith('COMMENT   CCD Camera > Bias (e/Pixel) = 2000'))).toBe(true);
  expect(cards.find(c=>c.startsWith('NAXIS1'))).toContain('512');expect(isUncertifiedCameraFits(cards)).toBe(true);expect(isUncertifiedCameraFits(cameraFitsCards(plain,context))).toBe(false);expect(cards.find(c=>c.startsWith('CRPIX1'))).toContain('257');
 });
 test('Information lists the current record (0x512d5a / 0x514d8a)',()=>{
  const r=withRecord('ir',{detector:'Lab IR',readNoiseElectronsPerPixel:Math.fround(20),cooling:'thermoelectric'}).ir;
  expect(cameraInformationLines('ir',r)).toEqual(['Detector: Lab IR','Image Size (pixels): 512 x 512','Pixel Size (microns): 40.0 x 40.0','Read Noise (electrons/pixel): 20.0','Dark Noise (electrons/pixel/sec): 0.7','Bias (electrons/pixel): 1000.0','AD Depth (bits): 32','Well Depth (electrons): 250000','Cooling: Thermoelectric']);
  expect(cameraInformationLines('ir')).toEqual(cameraInformationLines('ir',C.ir));
 });
});

describe('T7 records: JSON and native bytes',()=>{
 test('the JSON form round-trips and refuses wrong shapes',()=>{
  const p=withRecord('ccd',{width:256,cooling:'liquidNitrogen',detector:'Lab CCD'});
  const back=readCameraParameters(JSON.parse(JSON.stringify(cameraParametersJson(p))));expect(sameCameraParameters(back,p)).toBe(true);
  expect(()=>readCameraParameters({ccd:{...cameraParametersJson(C).ccd,width:1.5},ir:cameraParametersJson(C).ir})).toThrow(TypeError);
  expect(()=>readCameraParameters({ccd:cameraParametersJson(C).ccd})).toThrow(TypeError);
  expect(()=>readCameraParameters({ccd:{...cameraParametersJson(C).ccd,extra:1},ir:cameraParametersJson(C).ir})).toThrow(TypeError);
 });
 test('a native 91-byte record: little-endian fields; NaN Singles, a control-character name and a flag byte > 1 keep compiled fields',()=>{
  const b=new Uint8Array(91),v=new DataView(b.buffer),name='Lab CCD';b[0]=name.length;for(let i=0;i<name.length;i++)b[1+i]=name.charCodeAt(i);
  [[0x29,24],[0x2d,24],[0x31,8],[0x35,2],[0x39,10]].forEach(([o,x])=>v.setFloat32(o,x,true));
  [[0x3d,1000],[0x41,10],[0x45,1500],[0x49,512],[0x4d,256],[0x51,16],[0x55,320000]].forEach(([o,x])=>v.setInt32(o,x,true));b[0x59]=1;b[0x5a]=0;
  const r=readNativeCameraRecord('ccd',b,0);expect(r.representable).toBe(true);
  expect(r.record).toMatchObject({detector:'Lab CCD',readNoiseElectronsPerPixel:8,biasElectronsPerPixel:1500,width:512,height:256,cooling:'liquidNitrogen',positionNoise:false});
  v.setFloat32(0x31,NaN,true);b[0x5a]=7;const n=readNativeCameraRecord('ccd',b,0);
  expect(n.representable).toBe(false);expect(n.record.readNoiseElectronsPerPixel).toBe(5);expect(n.record.positionNoise).toBe(true);
  // Review 1 L3: a length byte above 40 is not representable and keeps the compiled name.
  v.setFloat32(0x31,8,true);b[0x5a]=0;expect(readNativeCameraRecord('ccd',b,0).representable).toBe(true);
  const long=new Uint8Array(b);long[0]=41;const l=readNativeCameraRecord('ccd',long,0);
  expect(l.representable).toBe(false);expect(l.record.detector).toBe(C.ccd.detector);expect(l.record.readNoiseElectronsPerPixel).toBe(8);
 });
});
