import {afterEach,describe,expect,it,vi} from 'vitest';
import {readAnalysisSession} from './analysisSession';
import {FIELD_SPECTRUM_FORMAT,fieldSpectrumPolicy} from '../core/fieldSpectrometer';

// G4c review 1 M1: a fresh page (this file's own module graph: ObjectX.HTL positions not yet loaded) restoring a v33 part
// while no same-origin file arrives is a missing resource, not an invalid file.
afterEach(()=>{vi.unstubAllGlobals();});
describe('v33 restore with no network on a fresh page',()=>{
 it('fails as resources, not state',async()=>{
  vi.stubGlobal('fetch',async()=>{throw new TypeError('Failed to fetch');});
  const fieldSpectrum={format:FIELD_SPECTRUM_FORMAT,version:1,policy:fieldSpectrumPolicy({ra:12.99311111111111,dec:27.959722222222222},1),seedAtReset:5,events:[]};
  const text=JSON.stringify({format:'OpenVireo analysis session',version:33,numericalPolicy:'Number_x87_equivalence_unvalidated',base:{version:1},
   fieldSpectrumPolicy:'openvireo-field-spectrum-investigation-v33',fieldSpectrumDigestSHA256:'0'.repeat(64),fieldSpectrum});
  await expect(readAnalysisSession(new File([text],'offline.json'))).rejects.toMatchObject({code:'resources'});
 });
});
