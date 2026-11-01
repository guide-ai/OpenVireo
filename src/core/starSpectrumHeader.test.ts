import {describe,expect,it} from 'vitest';
import {gscStarHeaderName} from './exposureSpectrum';
import {STAR_TARGET} from './starExposure';

// Front RE6 review 1 L4: the star route's .SSP header names the GSC record as VIREO does (<band>-<name>, 0x59b125..0x59b196).
describe('GSC header name',()=>{
 it('the star route target N0000.DAT@14428 is N0000-00008',()=>{expect(gscStarHeaderName(STAR_TARGET.id,STAR_TARGET.rawHex)).toBe('N0000-00008');});
 it('refuses a name longer than 5 characters',()=>{const b=STAR_TARGET.rawHex.split('');b.splice(0x15*2,2,'0','6');expect(()=>gscStarHeaderName(STAR_TARGET.id,b.join(''))).toThrow();});
});
