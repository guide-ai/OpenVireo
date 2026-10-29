import {describe,it,expect} from 'vitest';
import provenance from '../../docs/LSS-L2-PROVENANCE.json';
describe('docs/LSS-L2-PROVENANCE.json',()=>{
 it('binds the binary; every contract cites listed evidence with ranges and a [D]/[I] tag',()=>{
  expect(provenance.artifact.sha256).toBe('781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c');
  const ids=new Set(provenance.derivedEvidence.map(e=>e.id));
  for(const e of provenance.derivedEvidence)expect(e.sha256).toMatch(/^[a-f0-9]{64}$/);
  for(const c of provenance.contracts){expect(['D','I']).toContain(c.tag);expect(c.ranges.length).toBeGreaterThan(0);for(const e of c.evidence)expect(ids.has(e),`${c.id} ${e}`).toBe(true);}
  expect(provenance.webPolicies.every(w=>w.tag==='W')).toBe(true);
 });
});
