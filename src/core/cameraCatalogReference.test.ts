import {describe,it,expect} from 'vitest';
import {cameraCatalogReference,nomadBandForCameraFilter} from './cameraCatalogReference';
import {cameraPreparationReference} from './cameraPreparation';
import recovered from '../../docs/CAMERA-FILTER-CATALOG-PROVENANCE.json';
describe('compiled camera filter/source authority,not a selected exposure',()=>{
 it.each(recovered.compiledRows)('matches recovered $camera position$position/$filter',r=>{expect(cameraCatalogReference(r.camera,r.position)).toEqual(r);expect(Object.isFrozen(cameraCatalogReference(r.camera,r.position))).toBe(true);if(r.nomadReader)expect(nomadBandForCameraFilter(r.camera,r.position)).toBe(r.selectedBand);else expect(()=>nomadBandForCameraFilter(r.camera,r.position)).toThrow('USNO-B1 I2');});
 it('preserves CCD NF→R and the mode override for I without treating NF as calibration',()=>{
  expect(nomadBandForCameraFilter('ccd',0)).toBe('R');expect(cameraCatalogReference('ccd',4)).toMatchObject({mode:1,catalog:'USNO-B1',selector:2,selectedBand:'I',queryBand:'I2',nomadReader:false});expect(()=>nomadBandForCameraFilter('ccd',4)).toThrow();expect(nomadBandForCameraFilter('ir',0)).toBe('J');
 });
 it('matches original control positions for every applied telescope without becoming selected filter state',()=>{
  for(const kind of['ccd','ir']as const)for(const index of[0,1,2]){const r=cameraPreparationReference(kind,index);expect(r.filters.map((_,p)=>cameraCatalogReference(kind,p).filter)).toEqual(r.filters);expect(r).not.toHaveProperty('selectedFilter');}
 });
 it('rejects invalid camera/position inputs without clamping or falling back to another source',()=>{
  for(const kind of['CCD','IR','__proto__',null,{},0])expect(()=>cameraCatalogReference(kind,0)).toThrow();
  for(const p of[-1,.5,NaN,Infinity,'0',null,{},5])expect(()=>cameraCatalogReference('ccd',p)).toThrow();expect(()=>cameraCatalogReference('ir',3)).toThrow();
 });
 it('cannot mutate source/mode/band across calls',()=>{const r=cameraCatalogReference('ccd',4);expect(Reflect.set(r,'catalog','NOMAD')).toBe(false);expect(Reflect.set(r,'queryBand','R')).toBe(false);expect(cameraCatalogReference('ccd',4)).toEqual(r);expect(cameraCatalogReference('ccd',3).catalog).toBe('NOMAD');});
});
