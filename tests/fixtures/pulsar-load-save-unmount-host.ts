// TEST-ONLY host for tests/pulsar-load-save-unmount.spec.ts (R-RX18, WEB-RX18-08). Imported only by that spec, through the Vite
// dev server, after the real App has loaded (so the React refresh preamble and the same React copy are already in the page). It is
// not a product, debug or global entry point: no window hook, no route, nothing exported to the App.
//
// The harness owns its own dataset (useSharedPulsarData) and stays mounted while its PulsarAnalysis child is mounted and unmounted,
// which the App never does (the App keeps its panel mounted). The seeded capture is SYNTHETIC: built with the public pure
// constructors (pulsarMemoryRecording, the lease steps and commitPulsarCapture), not a receiver simulation run and not CLEA data.
// The outputs are read-only monitors of the owner's document; each one handles empty (null) data.
import { createElement as h, useRef, useState, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import PulsarAnalysis from '../../src/components/PulsarAnalysis';
import { useSharedPulsarData } from '../../src/useSharedPulsarData';
import {
  acquirePulsarCaptureLease, commitPulsarCapture, isFileData, isMemoryData, pulsarDataRows, pulsarMemoryRecording, pulsarOutputClaim, pulsarWrittenCopy,
  releasePulsarCaptureLease, setPulsarCapturePhase, type PulsarMemoryRecording,
} from '../../src/core/pulsarCurrentData';

export const UNMOUNT_HOST_TEST_ID = 'pulsar-unmount-host';
const CAPTURE_ID = 1;

/** A synthetic three-receiver capture of 20 rows with small integer samples (not observed data, not a simulation output). */
function syntheticCapture(): PulsarMemoryRecording {
  const rows: number[] = [];
  for (let i = 0; i < 20; i++) rows.push(i % 5, (i + 2) % 5, (i + 4) % 5);
  return pulsarMemoryRecording({
    captureId: CAPTURE_ID, name: 'SYNTH UNMOUNT', aperture: 25, highestIndex: 2,
    frequencies: [400, 600, 800], gains: [1, 1, 1], start: 50000.5, interval: 0.01, rows, full: false,
  });
}

/** Props through a helper, so the hyphenated test id is not an object-literal excess property. */
const attrs = (testId: string, extra: object = {}) => ({ 'data-testid': testId, ...extra });

function Harness(): ReactElement {
  const shared = useSharedPulsarData();
  const [child, setChild] = useState(false);
  const seeded = useRef<PulsarMemoryRecording | null>(null);
  const [seedResult, setSeedResult] = useState('');
  const doc = shared.doc, data = doc.data, written = pulsarWrittenCopy(doc), claim = pulsarOutputClaim(doc);
  const origin = data === null ? 'none' : isMemoryData(data) ? 'memory' : isFileData(data) ? 'file' : 'cleared';
  // acquire (no erase) → receiving → commit → release: generation 0 → 1, no lease left.
  const seed = () => {
    const memory = syntheticCapture();
    const steps = [
      shared.update(d => acquirePulsarCaptureLease(d, CAPTURE_ID, d.generation, false)).ok,
      shared.update(d => setPulsarCapturePhase(d, CAPTURE_ID, 'receiving')).ok,
      shared.update(d => commitPulsarCapture(d, CAPTURE_ID, memory)).ok,
      shared.update(d => releasePulsarCaptureLease(d, CAPTURE_ID)).ok,
    ];
    if (steps.every(Boolean)) seeded.current = memory;
    setSeedResult(steps.every(Boolean) ? 'ok' : 'refused');
  };
  const out = (testId: string, value: string) => h('output', attrs(testId), value);
  return h('div', null,
    h('button', attrs('uh-seed', { type: 'button', onClick: seed }), 'Seed'),
    h('button', attrs('uh-mount', { type: 'button', onClick: () => setChild(true) }), 'Mount child'),
    h('button', attrs('uh-unmount', { type: 'button', onClick: () => setChild(false) }), 'Unmount child'),
    out('uh-seed-result', seedResult),
    out('uh-child', child ? 'mounted' : 'unmounted'),
    out('uh-generation', String(doc.generation)),
    out('uh-rows', String(pulsarDataRows(data))),
    out('uh-origin', origin),
    out('uh-seeded', String(seeded.current !== null && data === seeded.current)),
    out('uh-receipt', written === null ? '' : written.fileName),
    out('uh-claim', claim === null ? 'null' : `${claim.owner}:${claim.token}`),
    out('uh-activity', `${doc.analysis.modal}/${doc.analysis.reading}`),
    child ? h(PulsarAnalysis, { data: shared, idPrefix: 'uh-' }) : null,
  );
}

/** Appends this host's own container to the body and renders the harness in its own root. */
export function mountUnmountHost(): void {
  const container = document.createElement('div');
  container.setAttribute('data-testid', UNMOUNT_HOST_TEST_ID);
  document.body.appendChild(container);
  createRoot(container).render(h(Harness));
}
