import{describe,expect,it}from'vitest';
import{readFileSync}from'node:fs';
import path from'node:path';
import{WEDGE_EVIDENCE_ID,WEDGE_EXECUTABLE_SHA256}from'./wedgeLssText';
import{WEDGE_C_EXTENDED_BYTES}from'./wedgeNumeric';
import{WEDGE_COLOUR_SCHEMES}from'./wedgePlot';
const doc=JSON.parse(readFileSync(path.resolve(import.meta.dirname,'../../docs/WEDGE-PLOT-PROVENANCE.json'),'utf8'));
describe('LSS wedge provenance record',()=>{
 it('names the same executable, evidence, c constant and colours as the code',()=>{
  expect(doc.executable.sha256).toBe(WEDGE_EXECUTABLE_SHA256);expect(doc.evidenceId).toBe(WEDGE_EVIDENCE_ID);expect(doc.originalExecuted).toBe(false);
  const text=JSON.stringify(doc);expect(text).toContain(WEDGE_C_EXTENDED_BYTES);
  for(const s of WEDGE_COLOUR_SCHEMES)for(const d of Object.values(s.dwords))expect(text).toContain('0x'+d.toString(16).padStart(8,'0'));
  expect(doc.rea.result).toMatch(/no symbols/);expect(doc.sources.every((s:{sha256?:string})=>s.sha256===undefined||/^[0-9a-f]{64}$/.test(s.sha256))).toBe(true);
 });
});
