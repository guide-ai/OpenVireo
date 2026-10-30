import {describe,expect,it} from 'vitest';
import {loadedFieldAt,setLoadedField} from './loadedField';
import type {FieldPopulation} from '../core/fieldEngine';

// G2 review 1 R1: the Star Data List lists the loaded field while the pointing stays inside its cached area (0x53af28).
describe('loaded field',()=>{
 it('is listed inside the cached area and not beyond it, and nothing is listed once cleared',()=>{
  const population={} as FieldPopulation,anchor={ra:7.7,dec:22};
  setLoadedField({anchor,population});
  expect(loadedFieldAt({ra:7.7,dec:22.2})?.population).toBe(population);
  expect(loadedFieldAt({ra:7.7,dec:22.3})).toBeNull();
  setLoadedField(null);expect(loadedFieldAt(anchor)).toBeNull();
 });
});
