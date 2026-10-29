// Test-only harness for tests/pulsar-analysis.spec.ts (docs/PULSAR-ANALYSIS.md, docs/TEST-HARNESSES.md). Ported from the
// PLR analysis front harness (task-3/claude-pulsar-analysis/harness/vite.harness.mjs, 2026-10-21): one page that calls
// mountPulsarWorkbench and keeps its {render, unmount} controller on window.__pulsarHarness. Like the original page it
// loads no App stylesheet, only a plain body style.
import {mountPulsarWorkbench} from '../../src/components/PulsarAnalysis.tsx';

document.body.style.cssText='margin:0;font-family:system-ui,sans-serif;background:#f6f6f6;color:#111';
const main=document.createElement('main');main.id='root';
document.getElementById('harness-root')!.replaceWith(main);
(window as unknown as {__pulsarHarness:unknown}).__pulsarHarness=mountPulsarWorkbench(main);
