import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import provenance from '../../docs/PULSAR-ANALYSIS-PROVENANCE.json';
import { PULSAR_BASES, PULSAR_PANEL_HEIGHTS } from './pulsarAnalysis';
import { PULSAR_PAN_TIMER_MS } from './pulsarPanHold';

describe('pulsar provenance', () => {
  it('every evidence ID cited by the core is documented, with an address range', () => {
    const documented = new Map(provenance.contracts.map(c => [c.id, c]));
    const cited = new Set<string>();
    for (const file of ['pulsarAnalysis.ts', 'pulsarRecording.ts'])
      for (const m of readFileSync(new URL(`./${file}`, import.meta.url), 'utf8').matchAll(/'(PLR-[A-Z-]+-\d\d)'/g)) cited.add(m[1]);
    expect(cited.size).toBeGreaterThan(10);
    for (const id of cited) { expect(documented.has(id), id).toBe(true); expect(documented.get(id)!.range).toMatch(/^0x[0-9a-f]+/); }
  });
  it('records the artifact hash, the REA evidence and the gated contracts', () => {
    expect(provenance.artifact.sha256).toBe('781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c');
    expect(provenance.rea.evidenceId).toMatch(/^ev_[0-9a-f]{64}$/);
    expect(provenance.contracts.filter(c => 'status' in c && String(c.status).startsWith('GATED')).map(c => c.id)).toEqual(['PLR-REVIEW-01', 'PLR-CSV-01']);
    expect(provenance.acceptanceClaim).toMatch(/^none/);
  });
  it('pins the recovered DFM geometry and PanTimer interval and drops superseded claims', () => {
    const geom = provenance.contracts.find(c => c.id === 'PLR-GEOM-01')!, pan = provenance.contracts.find(c => c.id === 'PLR-PAN-01')!;
    expect(geom.observed).toContain(`Height ${PULSAR_PANEL_HEIGHTS.join('/')}`);
    expect(geom.observed).toContain(`base = ${PULSAR_BASES.join('/')}`);
    expect(pan.observed).toContain(`Interval ${PULSAR_PAN_TIMER_MS}`);
    const docs = JSON.stringify(provenance) + readFileSync(new URL('../../docs/PULSAR-ANALYSIS.md', import.meta.url), 'utf8');
    expect(docs).not.toMatch(/TRadioFlDlg|base = 200|base is 200|interval is not recovered|timer interval is not recovered/);
  });
  it('does not assert a native route for a blank first line, and keeps it distinct from an empty file', () => {
    const read = provenance.contracts.find(c => c.id === 'PLR-READ-01')!;
    const texts = [JSON.stringify(read), readFileSync(new URL('../../docs/PULSAR-ANALYSIS.md', import.meta.url), 'utf8'),
      readFileSync(new URL('./pulsarRecording.ts', import.meta.url), 'utf8'), readFileSync(new URL('../components/PulsarMessages.ts', import.meta.url), 'utf8')];
    for (const text of texts) expect(text).not.toMatch(/blank (first )?line[^.]*(takes|reads? such a file by|by) the headerless route|including a blank one, takes the headerless/i);
    expect(read.web).toMatch(/blank first line .*not established/);
    expect(read.web).toContain("'empty'");
  });
  it('binds Single 0x56c440 = 0.0 to the coordinator static data decode, without widening it to runtime FPU parity', () => {
    const redraw = provenance.contracts.find(c => c.id === 'PLR-REDRAW-01')!;
    expect(provenance.coordinatorEvidence.files).toHaveProperty(['COORDINATOR-correction-triage/static-data-decode.json']);
    expect(JSON.stringify(redraw)).toMatch(/0x56c440 .*0\.0.*static data decode/);
    expect(JSON.stringify(redraw)).not.toMatch(/0x56c440 is read as 0\.0 from listing encodings/);
    const remaining = provenance.gates.find(g => g.startsWith('Remaining f32 constants'))!;
    expect(remaining).not.toMatch(/0x56c440/);
    expect(remaining).toMatch(/0x56c444/);
    expect(provenance.gates.some(g => /x87 rounding/.test(g))).toBe(true);
  });
});
