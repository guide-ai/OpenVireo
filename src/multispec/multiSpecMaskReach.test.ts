import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {parseHtl} from '../core/hotList';
import {separationDegrees} from '../core/ephemeris';
import {FIELD_HALF_DEGREES,freshFieldArea} from '../core/fieldEngine';
import {OBJECT_X_HIDE_DEGREES} from '../core/objectXLab';
import {MULTISPEC_MASK_REACH} from './multiSpecFields';

// G-merge review L1: the mask must reach every point of the instrument field area, not only its half-height. The area is
// Dec ± 0.375°, RA ± 0.375/(15·cos Dec) h at the centre's Dec, so its corners lie farther than 0.375° from the centre
// (0.53° at the equator, more at higher |Dec|, where the lower-|Dec| corners widen).
const cornerReach=(p:Readonly<{ra:number;dec:number}>)=>{
 const h=FIELD_HALF_DEGREES.instrument,hr=h/(Math.cos(p.dec*Math.PI/180)*15);
 return Math.max(...[-1,1].flatMap(sr=>[-1,1].map(sd=>separationDegrees(p.ra,p.dec,p.ra+sr*hr,p.dec+sd*h))));
};
describe('Multi-Spec Object X mask reach (G-merge review L1)',()=>{
 it('covers the field corners of every centre that could put a corner within the hide radius of an Object X position',()=>{
  const positions=parseHtl(new Uint8Array(readFileSync('public/original/hotlists/ObjectX.HTL'))).map(r=>({ra:r.ra,dec:r.dec}));
  // The corner reach depends only on the centre's Dec; any centre within the hide radius plus the reach can matter.
  const span=OBJECT_X_HIDE_DEGREES+MULTISPEC_MASK_REACH+.05;let worst=0;
  for(const q of positions)for(let d=-span;d<=span;d+=.005){
   const p={ra:q.ra,dec:q.dec+d};if(Math.abs(p.dec)>89)continue;
   freshFieldArea(p);worst=Math.max(worst,cornerReach(p));
  }
  expect(worst).toBeGreaterThan(.53);
  expect(worst).toBeLessThanOrEqual(MULTISPEC_MASK_REACH);
  expect(OBJECT_X_HIDE_DEGREES+MULTISPEC_MASK_REACH).toBeGreaterThan(OBJECT_X_HIDE_DEGREES+worst-1e-9);
 });
});
