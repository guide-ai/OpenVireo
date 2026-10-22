import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import provenance from '../../docs/PULSAR-ANALYSIS-PROVENANCE.json';
import { PULSAR_BASES, PULSAR_PANEL_HEIGHTS } from './pulsarAnalysis';
import { PULSAR_PAN_TIMER_MS } from './pulsarPanHold';

describe('pulsar provenance', () => {
  it('every evidence ID cited by the core is documented, with an address range', () => {
    const documented = new Map(provenance.contracts.map(c => [c.id, c]));
    const cited = new Set<string>();
    for (const file of ['pulsarAnalysis.ts', 'pulsarRecording.ts', 'pulsarReview.ts', 'pulsarReviewEdit.ts'])
      for (const m of readFileSync(new URL(`./${file}`, import.meta.url), 'utf8').matchAll(/'(PLR-[A-Z-]+-\d\d)'/g)) cited.add(m[1]);
    expect(cited.size).toBeGreaterThan(10);
    for (const id of cited) { expect(documented.has(id), id).toBe(true); expect(documented.get(id)!.range).toMatch(/^0x[0-9a-f]+/); }
  });
  it('binds the Review transaction and Delete to their source captures, keeping Find gated', () => {
    const byId = new Map(provenance.contracts.map(c => [c.id, c]));
    const listing = new Map(provenance.listings.map(l => [l.id, l]));
    expect(byId.get('PLR-REVIEW-TRANSACTION-STATIC-01')!.range).toBe('0x563464..0x5634c6');
    expect(byId.get('PLR-REVIEW-DELETE-STATIC-01')!.range).toBe('0x56388c..0x563955');
    expect(byId.get('PLR-REVIEW-CALLER-STATIC-01')!.range).toBe('0x56f74c..0x56f7ab');
    expect(listing.get('GNU-REVIEW-METHODS')!.sha256).toBe('428c12258ff8b7a1059150e999f645f0d9b472a3a9054e2b99c26b095b28ef48');
    expect(listing.get('GNU-REVIEW-DELETE')!.sha256).toBe('f4d97cbd6b601baa9bfa203a231884acaedf62f692c1671d9f16ab02fc33e44b');
    expect(listing.get('REVIEW-DFM')!.sha256).toBe('3fb3dceffd06a20dffb1b00e0fbc476b3e6c82063f291fd260bf753cb103f531');
    const gated = String((byId.get('PLR-REVIEW-01') as { status?: string }).status);
    // Superseded by the comment-only Edit (PLR-REVIEW-EDIT-STATIC-01): Find alone stays gated.
    expect(gated.slice(0, gated.indexOf(':'))).toBe('GATED for Find (FndBtnClick 0x5634c8)');
    expect(gated).toMatch(/EditBtnClick 0x56373c is implemented for the comment only/);
    expect(gated).not.toMatch(/read-only list/);
    expect(JSON.stringify(byId.get('PLR-REVIEW-TRANSACTION-STATIC-01'))).toMatch(/OnActivate.*not recovered|VCL runtime question/);
  });
  it('binds the comment-only Edit to its caller, editor, parser, inherited Cancel and RTL captures, without native-equivalence claims', () => {
    const edit = provenance.contracts.find(c => c.id === 'PLR-REVIEW-EDIT-STATIC-01') as Record<string, string> | undefined;
    expect(edit).toBeDefined();
    expect(edit!.range).toBe('0x56373c..0x56385c, 0x570f6c..0x5710b3, 0x5710d0..0x5713f2, 0x570498..0x570879, 0x570b30..0x570b3a');
    expect(edit!.uncertainty).toMatch(/OnActivate/);
    expect(edit!.uncertainty).toMatch(/not original-equivalent/);
    const listing = new Map(provenance.listings.map(l => [l.id, l]));
    for (const [id, sha] of [
      ['GNU-EDIT-OK', '646f14ae683c1d9417c7f214da4f9f5975aeaefb428abba433b2c7eebd783d30'],
      ['GNU-EDIT-PARSER', 'a6d927bc6de21291930d91a1de64a654d31d0d6d4cc56e55f98f49b6ebcb2ccf'],
      ['GNU-EDIT-METHODS', 'f47a91376ba9366a04235cb11c4792b841ea2ece33d202e90be4a59f92cb2059'],
      ['GNU-EDIT-CANCEL', '1c7e06e87fc2aff98a4031914da2723cb54a1022dea693213d2c2ee0153fc2f1'],
      ['EDIT-TYPED-LITERALS', 'fddbf077ed55dd9b23312c5328febba99821c11f534330938604fb8245a5e80f'],
      ['EDIT-REMAINING-GAPS', '462a447769427931c652361e41651a7448412399746810ff8b4005cf54095d09'],
      ['EDIT-NO-SELECTION-LITERALS', '7a015a4e85d32b94502fa56f2125fd18201a5da90766f7f76668f767234dc648'],
    ] as const) expect(listing.get(id)?.sha256, id).toBe(sha);
  });
  it('describes the enabled Edit, its parsing of the candidate and its template check without stale or overstated claims', () => {
    const byId = new Map(provenance.contracts.map(c => [c.id, c as Partial<Record<string, string>>]));
    const record = byId.get('PLR-RECORD-01')!, transaction = byId.get('PLR-REVIEW-TRANSACTION-STATIC-01')!, edit = byId.get('PLR-REVIEW-EDIT-STATIC-01')!;
    expect(record.inference).not.toMatch(/Nothing reads it/);
    expect(record.inference).toMatch(/Only the comment-only Review editor \(PLR-REVIEW-EDIT-STATIC-01\) reads it/);
    expect(transaction.web).not.toMatch(/Find and Edit are disabled|\(rows, Delete, Ok, Cancel\)|not shown, parsed/);
    expect(transaction.web).toMatch(/the named scroll region, the selected row, Edit, Delete, Ok, Cancel/);
    expect(edit.web).toMatch(/self-consistency guard/);
    expect(edit.uncertainty).toMatch(/proves only self-consistency/);
    const text = JSON.stringify(provenance) + ['../../docs/PULSAR-ANALYSIS.md', './pulsarReviewEdit.ts', './pulsarAnalysis.ts', './pulsarAnalysis.test.ts', './pulsarReviewEdit.test.ts'].map(f => readFileSync(new URL(f, import.meta.url), 'utf8')).join('');
    expect(text).not.toMatch(/two (chosen |independent )?models|Second, independent model|not parsed, validated or exported/);
    expect(readFileSync(new URL('../../docs/PULSAR-ANALYSIS.md', import.meta.url), 'utf8')).toMatch(/while the inner question, notice or comment editor is open/);
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
  it('describes keyboard panning by click and latch, without a per-physical-press or assistive-technology promise', () => {
    const pan = provenance.contracts.find(c => c.id === 'PLR-PAN-01')!;
    const texts = [JSON.stringify(pan), readFileSync(new URL('../../docs/PULSAR-ANALYSIS.md', import.meta.url), 'utf8'),
      readFileSync(new URL('./pulsarAnalysis.ts', import.meta.url), 'utf8'), readFileSync(new URL('../components/PulsarAnalysis.tsx', import.meta.url), 'utf8')];
    for (const text of texts) expect(text).not.toMatch(/(steps|once) per physical (key )?press|assistive activation steps|steps on a keydown that is not marked/i);
    expect(pan.web).toMatch(/native click event/);
    expect(pan.web).toMatch(/latched, also for a keydown with repeat=false/);
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
