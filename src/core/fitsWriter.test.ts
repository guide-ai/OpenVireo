import {describe,expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {composeCameraExposure} from './cameraExposure';
import {readVizierCatalog,selectVizierCatalog,wholeSkySelection} from './vizierNomad';
import {parseFitsImage,fitsPixel} from './fitsImage';
import {writeCameraFits,cameraFitsCards,cameraFitsFileName,jdToIso,type CameraFitsContext} from './fitsWriter';

const recorded=new Uint8Array(readFileSync(new URL('../../tests/fixtures/vizier/nomad-56.75+24.12-r0.01.xml',import.meta.url)));
const selection=selectVizierCatalog(readVizierCatalog(recorded,{catalog:'I/297',band:'R',epochOffsetYears:0,queryBrightMagnitude:1,queryFaintMagnitude:21.5}),wholeSkySelection(21.5));
const exposure=composeCameraExposure({camera:'ccd',opticalIndex:0,filterPosition:0,seconds:10,gain:2,centerRaHours:56.745/15,centerDecDegrees:24.118,seed:20261027},selection);
const context:CameraFitsContext={jd:2461341.25,filterName:'NF',catalogName:'NOMAD',source:{mode:'live',sha256:'da65f76732e4d849c3ddb3b40825d5b49bd1f9b170b34d8c5fab86a511f6b3eb',extractId:null,url:'https://vizier.cds.unistra.fr/viz-bin/conesearch/I/297/out?RA=56.750000&DEC=24.120000&SR=0.23'}};

describe('camera FITS writer',()=>{
 test('round-trips through the bounded FITS reader with every pixel bit unchanged',()=>{
  const bytes=writeCameraFits(exposure,context);expect(bytes.length%2880).toBe(0);
  const image=parseFitsImage(bytes);expect([image.width,image.height,image.unpadded]).toEqual([1024,1024,false]);
  for(const [x,y] of [[1,1],[1024,1],[1,1024],[513,513],[1024,1024]]){
   expect(fitsPixel(image,x,y).value).toBe(exposure.plane.pixels[(y-1)*1024+(x-1)]);
  }
  const view=new DataView(bytes.buffer,image.dataOffset);let same=true;
  for(let i=0;i<exposure.plane.pixels.length;i++)if(view.getFloat32(i*4,false)!==exposure.plane.pixels[i]){same=false;break;}
  expect(same).toBe(true);
 });
 test('header carries the observation, catalog, seed and a TAN WCS centred on the pointing',()=>{
  const cards=cameraFitsCards(exposure,context);const get=(k:string)=>cards.find(c=>c.startsWith(k.padEnd(8)+'='))?.slice(10).split(' / ')[0].trim();
  expect(cards.every(c=>c.length===80)).toBe(true);expect(cards.at(-1)).toBe('END'.padEnd(80));
  expect(get('DATE-OBS')).toBe("'2026-10-27T18:00:00.000'");expect(get('EXPTIME')).toBe('10');expect(get('FILTER')).toBe("'NF      '");
  expect(get('CTYPE1')).toBe("'RA---TAN'");expect(Number(get('CRPIX1'))).toBeCloseTo(513,9);expect(Number(get('CRPIX2'))).toBeCloseTo(513,9);
  expect(Number(get('CDELT1'))).toBeLessThan(0);expect(Number(get('CDELT2'))).toBeLessThan(0);
  expect(Math.abs(Number(get('CDELT1'))*3600)).toBeCloseTo(206264.806*0.024/4627.5,3);
  expect(get('CAMSEED')).toBe('20261027');expect(get('CATSHA')?.startsWith("'da65f767")).toBe(true);
  expect(get('CATHOST')).toBe(`'${new URL(context.source.url).hostname}'`);
  expect(cameraFitsFileName(context)).toBe('OpenVireo-CCD-20261027-180000-NF.fit');
  expect(jdToIso(2451545)).toBe('2000-01-01T12:00:00.000');
 });
 test('IR exposure (C6): 512 square, INSTRUME IR, 2MASS credit and IR file name; CCD cards carry none of these',()=>{
  const jhk=new Uint8Array(readFileSync(new URL('../../tests/fixtures/vizier/authored-nomad-jhk-control.xml',import.meta.url)));
  const k=selectVizierCatalog(readVizierCatalog(jhk,{catalog:'I/297',band:'K',epochOffsetYears:0,queryBrightMagnitude:1,queryFaintMagnitude:21.5}),wholeSkySelection(21.5));
  const ir=composeCameraExposure({camera:'ir',opticalIndex:0,filterPosition:2,seconds:1,gain:4,centerRaHours:56.745/15,centerDecDegrees:24.118,seed:5},k);
  const irContext:CameraFitsContext={...context,camera:'ir',filterName:'K'};
  const cards=cameraFitsCards(ir,irContext),ccd=cameraFitsCards(exposure,context);
  expect(cards).toContain("INSTRUME= 'IR      '".padEnd(80));expect(ccd).toContain("INSTRUME= 'CCD     '".padEnd(80));
  expect(cards.some(c=>c.startsWith('COMMENT J/H/K: 2MASS via NOMAD (Skrutskie et al. 2006'))).toBe(true);
  expect(ccd.some(c=>c.includes('2MASS'))).toBe(false);
  expect(cards.length).toBe(ccd.length+2);
  const image=parseFitsImage(writeCameraFits(ir,irContext));expect([image.width,image.height]).toEqual([512,512]);
  expect(cameraFitsFileName(irContext)).toBe('OpenVireo-IR-20261027-180000-K.fit');expect(cameraFitsFileName(context)).toMatch(/^OpenVireo-CCD-/);
 });
});
