import { describe, expect, it } from 'vitest';
import { PULSAR_SAVE_PICKER_OPTIONS } from '../core/pulsarSavedCopy';
import { browserPulsarSaveSupport, continuePulsarSave, invokePulsarSavePicker, type SaveHandle, type SaveWritable } from './pulsarSaveHost';

// R-RX15 browser I/O order (docs/PULSAR-SAVE-VERIFIED.md, WEB-SAVE-03..06). These are explicit in-memory fakes of the
// FileSystemAccess shapes that record call order; they test this module's sequencing and liveness, not a browser. The real
// OPFS stream path is covered by tests/radio-receiver-save-verified-app.spec.ts.

type Gate = { promise: Promise<void>; open: () => void; fail: (e: unknown) => void };
const gate = (): Gate => { let open!: () => void, fail!: (e: unknown) => void; const promise = new Promise<void>((r, j) => { open = r; fail = j; }); return { promise, open, fail }; };
const tick = () => new Promise<void>(r => setTimeout(r, 0));
type Fake = Partial<{ createFails: boolean; writeFails: boolean; closeFails: boolean; abortFails: boolean; getFileFails: boolean; readFails: boolean; size: number; tamper: boolean; holdWrite: Gate; holdClose: Gate; holdAbort: Gate; holdRead: Gate }>;

function fakeHandle(name: string, log: string[], f: Fake = {}) {
  let stored: Uint8Array = new Uint8Array(0), staged: Uint8Array | null = null;
  const stream: SaveWritable = {
    write: async data => { log.push(`write:${data.length}`); if (f.holdWrite) await f.holdWrite.promise; if (f.writeFails) throw new Error('disk'); staged = data.slice(); },
    close: async () => { log.push('close'); if (f.holdClose) await f.holdClose.promise; if (f.closeFails) throw new Error('close'); stored = staged ?? new Uint8Array(0); },
    abort: async () => { log.push('abort'); if (f.holdAbort) await f.holdAbort.promise; if (f.abortFails) throw new Error('abort'); staged = null; },
  };
  const handle: SaveHandle = {
    name,
    createWritable: async () => { log.push('createWritable'); if (f.createFails) throw new Error('denied'); return stream; },
    getFile: async () => {
      log.push('getFile'); if (f.getFileFails) throw new Error('gone');
      const bytes = f.tamper ? Uint8Array.from(stored, (b, i) => (i === 0 ? b ^ 1 : b)) : stored;
      return { size: f.size ?? bytes.length, arrayBuffer: async () => { log.push('arrayBuffer'); if (f.holdRead) await f.holdRead.promise; if (f.readFails) throw new Error('read'); return bytes.slice().buffer; } };
    },
  };
  return handle;
}
const payload = (log: string[]) => () => { log.push('payload'); return new Uint8Array([0x27, 0x41, 0x27, 0x0d, 0x0a]); };
const run = (picked: Promise<SaveHandle>, log: string[], live: () => boolean = () => true, max = 1024) =>
  continuePulsarSave(picked, payload(log), max, { live, phase: (code, file) => log.push(`phase:${code}:${file}`) });

describe('picker invocation and support (WEB-SAVE-01/02)', () => {
  it('calls showSaveFilePicker synchronously with the frozen options; a missing or throwing picker is refused without retry', () => {
    const calls: unknown[] = [];
    const w = { showSaveFilePicker(this: unknown, o: unknown) { calls.push([this, o]); return Promise.resolve(fakeHandle('a.PLR', [])); } };
    const r = invokePulsarSavePicker(w);
    expect(r.ok).toBe(true); expect(calls).toEqual([[w, PULSAR_SAVE_PICKER_OPTIONS]]);
    expect(invokePulsarSavePicker({}).ok).toBe(false);
    let thrown = 0;
    expect(invokePulsarSavePicker({ showSaveFilePicker: () => { thrown++; throw new Error('SecurityError'); } }).ok).toBe(false);
    expect(thrown).toBe(1);
    // The real global (Node/jsdom has no picker) is accepted as an argument and refused; a picker defined as undefined too.
    expect(invokePulsarSavePicker(globalThis).ok).toBe(false);
    expect(invokePulsarSavePicker({ showSaveFilePicker: undefined }).ok).toBe(false);
  });
  it('feature detection reads isSecureContext, the picker and FileSystemFileHandle.prototype.createWritable', () => {
    class WithWritable { createWritable() { return null; } }
    class Without {}
    const g = (o: object) => o as typeof globalThis;
    expect(browserPulsarSaveSupport(g({ isSecureContext: true, showSaveFilePicker: () => null, FileSystemFileHandle: WithWritable }))).toBe('ok');
    expect(browserPulsarSaveSupport(g({ isSecureContext: false, showSaveFilePicker: () => null, FileSystemFileHandle: WithWritable }))).toBe('insecure-context');
    expect(browserPulsarSaveSupport(g({ isSecureContext: true, FileSystemFileHandle: WithWritable }))).toBe('no-api');
    expect(browserPulsarSaveSupport(g({ isSecureContext: true, showSaveFilePicker: () => null, FileSystemFileHandle: Without }))).toBe('no-api');
    expect(browserPulsarSaveSupport(g({ isSecureContext: true, showSaveFilePicker: () => null }))).toBe('no-api');
  });
});

describe('continuePulsarSave sequencing', () => {
  it('success: one writable, one write of fresh payload bytes, close, then a bounded read-back; phases in order', async () => {
    const log: string[] = [];
    const r = await run(Promise.resolve(fakeHandle('copy.PLR', log)), log);
    expect(r).toEqual({ kind: 'readback', fileName: 'copy.PLR', bytes: new Uint8Array([0x27, 0x41, 0x27, 0x0d, 0x0a]) });
    expect(log).toEqual(['phase:writing:copy.PLR', 'createWritable', 'payload', 'write:5', 'phase:closing:copy.PLR', 'close', 'phase:reading:copy.PLR', 'getFile', 'arrayBuffer']);
  });
  it('picker AbortError is a cancel, any other rejection a refusal; nothing else is called', async () => {
    const log: string[] = [];
    expect(await run(Promise.reject(Object.assign(new Error('x'), { name: 'AbortError' })), log)).toEqual({ kind: 'picker-cancelled' });
    expect(await run(Promise.reject(Object.assign(new Error('x'), { name: 'SecurityError' })), log)).toEqual({ kind: 'picker-refused' });
    expect(await run(Promise.reject('plain'), log)).toEqual({ kind: 'picker-refused' });
    expect(log).toEqual([]);
  });
  it('a name without .PLR is not written: no writable is created', async () => {
    const log: string[] = [];
    expect(await run(Promise.resolve(fakeHandle('copy.txt', log)), log)).toEqual({ kind: 'extension', fileName: 'copy.txt' });
    expect(log).toEqual([]);
  });
  it('failures: createWritable, write (stream aborted), close (stream aborted, no read-back), getFile, oversize before arrayBuffer, arrayBuffer', async () => {
    const cases: [Fake, string, string[]][] = [
      [{ createFails: true }, 'write-failed', ['phase:writing:a.PLR', 'createWritable']],
      [{ writeFails: true }, 'write-failed', ['phase:writing:a.PLR', 'createWritable', 'payload', 'write:5', 'abort']],
      [{ closeFails: true }, 'close-failed', ['phase:writing:a.PLR', 'createWritable', 'payload', 'write:5', 'phase:closing:a.PLR', 'close', 'abort']],
      [{ getFileFails: true }, 'readback-failed', ['phase:writing:a.PLR', 'createWritable', 'payload', 'write:5', 'phase:closing:a.PLR', 'close', 'phase:reading:a.PLR', 'getFile']],
      [{ size: 1025 }, 'readback-too-large', ['phase:writing:a.PLR', 'createWritable', 'payload', 'write:5', 'phase:closing:a.PLR', 'close', 'phase:reading:a.PLR', 'getFile']],
      [{ readFails: true }, 'readback-failed', ['phase:writing:a.PLR', 'createWritable', 'payload', 'write:5', 'phase:closing:a.PLR', 'close', 'phase:reading:a.PLR', 'getFile', 'arrayBuffer']],
    ];
    for (const [f, kind, expected] of cases) {
      const log: string[] = [];
      expect(await run(Promise.resolve(fakeHandle('a.PLR', log, f)), log), kind).toEqual({ kind, fileName: 'a.PLR' });
      expect(log, kind).toEqual(expected);
    }
  });
  it('a rejected close is followed by one awaited abort: a held abort holds the result until it settles', async () => {
    const log: string[] = [], hold = gate();
    const p = run(Promise.resolve(fakeHandle('a.PLR', log, { closeFails: true, holdAbort: hold })), log).then(r => { log.push('settled'); return r; });
    await tick();
    expect(log.slice(-2)).toEqual(['close', 'abort']); expect(log).not.toContain('settled');
    hold.open();
    expect(await p).toEqual({ kind: 'close-failed', fileName: 'a.PLR' });
    expect(log.slice(-3)).toEqual(['close', 'abort', 'settled']);
    expect(log).not.toContain('getFile');
  });
  it('an abort that also rejects after a rejected close is not reported over close-failed and is not retried', async () => {
    const log: string[] = [];
    expect(await run(Promise.resolve(fakeHandle('a.PLR', log, { closeFails: true, abortFails: true })), log)).toEqual({ kind: 'close-failed', fileName: 'a.PLR' });
    expect(log.filter(e => e === 'abort')).toHaveLength(1);
    expect(log).not.toContain('getFile'); expect(log).not.toContain('phase:reading:a.PLR');
  });
  it('a tampered read-back is returned as read (the core compares it); it is never repaired', async () => {
    const log: string[] = [];
    const r = await run(Promise.resolve(fakeHandle('a.PLR', log, { tamper: true })), log);
    expect(r.kind === 'readback' && Array.from(r.bytes)).toEqual([0x26, 0x41, 0x27, 0x0d, 0x0a]);
  });
});

describe('liveness at every await (WEB-SAVE-06)', () => {
  it('dead after the picker: no writable is created', async () => {
    const log: string[] = [];
    expect(await run(Promise.resolve(fakeHandle('a.PLR', log)), log, () => false)).toEqual({ kind: 'dead' });
    expect(await run(Promise.reject(Object.assign(new Error('x'), { name: 'AbortError' })), log, () => false)).toEqual({ kind: 'dead' });
    expect(log).toEqual([]);
  });
  it('abandoned during a held write: the stream is aborted after the write settles, before any close, and only then is the result returned', async () => {
    const log: string[] = [], hold = gate();
    let alive = true;
    const p = run(Promise.resolve(fakeHandle('a.PLR', log, { holdWrite: hold })), log, () => alive).then(r => { log.push('settled'); return r; });
    await tick();
    expect(log).toEqual(['phase:writing:a.PLR', 'createWritable', 'payload', 'write:5']);
    alive = false; hold.open();
    expect(await p).toEqual({ kind: 'dead' });
    expect(log.slice(4)).toEqual(['abort', 'settled']);
  });
  it('abandoned during a held close that succeeds: no abort of a closing stream, no read-back, no claim of rollback', async () => {
    const log: string[] = [], hold = gate();
    let alive = true;
    const p = run(Promise.resolve(fakeHandle('a.PLR', log, { holdClose: hold })), log, () => alive);
    await tick();
    expect(log[log.length - 1]).toBe('close');
    alive = false; hold.open();
    expect(await p).toEqual({ kind: 'dead' });
    expect(log).not.toContain('abort'); expect(log).not.toContain('getFile'); expect(log).not.toContain('phase:reading:a.PLR');
  });
  it('abandoned during a held close that then rejects: the stream is still aborted, and dead is returned only after that', async () => {
    const log: string[] = [], hold = gate();
    let alive = true;
    const p = run(Promise.resolve(fakeHandle('a.PLR', log, { holdClose: hold, closeFails: true })), log, () => alive).then(r => { log.push('settled'); return r; });
    await tick();
    expect(log[log.length - 1]).toBe('close');
    alive = false; hold.open();
    expect(await p).toEqual({ kind: 'dead' });
    expect(log.slice(-3)).toEqual(['close', 'abort', 'settled']);
    expect(log).not.toContain('getFile'); expect(log).not.toContain('phase:reading:a.PLR');
  });
  it('a held read-back is not returned before it settles, and is dropped when the attempt died meanwhile', async () => {
    const log: string[] = [], hold = gate();
    let alive = true, done = false;
    const p = run(Promise.resolve(fakeHandle('a.PLR', log, { holdRead: hold })), log, () => alive).then(r => { done = true; return r; });
    await tick();
    expect(log[log.length - 1]).toBe('arrayBuffer'); expect(done).toBe(false);
    alive = false; hold.open();
    expect(await p).toEqual({ kind: 'dead' });
  });
  it('the payload is built fresh for each attempt', async () => {
    const log: string[] = [];
    await run(Promise.resolve(fakeHandle('a.PLR', log)), log);
    await run(Promise.resolve(fakeHandle('b.PLR', log)), log);
    expect(log.filter(e => e === 'payload')).toHaveLength(2);
  });
});
