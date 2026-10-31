import {describe,expect,it} from 'vitest';
import {fieldSpectrumFailure} from './fieldSpectrumFailure';
import {BoundedResourceError} from './boundedResource';
import {BundledGlxCatalogError} from './bundledGlxCatalog';
import {BundledQsoCatalogError} from './bundledQsoCatalog';
import {BundledHotListError} from './bundledHotList';
import {BundledVariableFileError} from './bundledVariableStars';
import {GscTileError} from './gscTiles';
import {FieldSpectrometerError} from './fieldSpectrometer';

const fetchShown={status:'unavailable',reason:'field-tiles',detail:'fetch'};
describe('field spectrometer failure mapping (G final closure N3)',()=>{
 it('a file that did not arrive is a retryable missing catalogue piece',()=>{
  for(const e of [new BundledGlxCatalogError('download'),new BundledQsoCatalogError('download'),new BundledHotListError('download'),new BundledVariableFileError('download'),new BoundedResourceError('download'),new GscTileError('fetch'),new TypeError('Failed to fetch')])
   expect(fieldSpectrumFailure(e),e.name).toEqual(fetchShown);
 });
 it('a file that arrived with the wrong size or hash is load-error',()=>{
  for(const e of [new BundledGlxCatalogError('size'),new BundledQsoCatalogError('sha256'),new BundledHotListError('sha256'),new BundledVariableFileError('size'),new BoundedResourceError('size'),new GscTileError('integrity'),new GscTileError('index'),new FieldSpectrometerError('resource')])
   expect(fieldSpectrumFailure(e),`${e.name} ${e.message}`).toEqual({status:'unavailable',reason:'load-error'});
 });
 it('anything else is internal, never fetch',()=>{
  for(const e of [new Error('boom'),new TypeError('x is not a function'),new GscTileError('budget'),new GscTileError('missing-tile'),'text'])
   expect(fieldSpectrumFailure(e)).toEqual({status:'unavailable',reason:'internal'});
 });
});
import {fieldSpectrumHiddenMasked} from './fieldSpectrumFailure';
describe('a hidden Object X target chosen after the field was prepared (G4c)',()=>{
 it('masks the field within the hide radius of its pointing, as preparation does, and only then',()=>{
  const p={ra:12,dec:20};
  expect(fieldSpectrumHiddenMasked(p,null)).toBe(false);
  expect(fieldSpectrumHiddenMasked(p,{ra:12,dec:21.99})).toBe(true);
  expect(fieldSpectrumHiddenMasked(p,{ra:12,dec:22.01})).toBe(false);
 });
});
