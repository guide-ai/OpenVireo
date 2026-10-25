// R-RX8 File ▸ Pulsar List... (TRadioLab.PulsarList1Click, CLEA_VEO.exe SHA-256 781bc970…c54c, entry 0x567f80..0x568023;
// docs/RADIO-PULSAR-PARAMETERS.md WEB-PP-LIST-04, docs/RADIO-ACCESS-OPTIONS.md WEB-ACC-LIST-01). Pure composition of two
// existing transitions on one snapshot: the modelled buffer write overwriteReceiverSourceBuffer (N2..N4: picker 0x562830
// with Extended 2.0, hit copy / miss clear of +0x5f7) and, from the buffer AFTER that write, the existing web Pulsar
// Parameters activation openPulsarParameters (N6, FormActivate 0x568c4c: first literal substring match or the head). No
// React, I/O, clock, RNG or menu write: the caller supplies every input and commits both owners only on ok.
// Evidence: /tmp/clea-static-research/radio-rx8-list-command-20261025 (RECOVERED-CONTRACT.json N1–N7, W1–W8; manifest
// SHA-256 37a7ed51…7e7d). Limits kept explicit: natively the hit copies 96 bytes (0x18 dwords) into +0x5f7 while the web
// keeps a typed frozen record of binary64 values (no byte-exact Extended storage); the native entry stores the buffer
// before its generic form calls (0x474408, 0x476f40, 0x47a010) and has no local handler, so the web all-or-nothing
// admission is a web safety policy, not native rollback; whether and when 0x47a010 delivers OnActivate, and the form
// lifetime, are unproven (G5). The selection is the recovered picker (file order, first in-window run, no RA wrap,
// strict limit, earlier tie kept), not a global nearest search, and the window may show an earlier prefix or duplicate
// row than the record copied into the buffer.
import type {RadioPointing} from './radioAntenna';
import type {RadioPulsarListMenu} from './radioAccessOptions';
import type {PulsarCatalog} from './radioPulsarCatalog';
import {pulsarSeedFromBuffer} from './radioPulsarList';
import {openPulsarParameters,pulsarParametersOpenRefusal,type PulsarParametersWindow} from './radioPulsarParameters';
import {overwriteReceiverSourceBuffer,receiverBoxRefusal,type RadioReceiverSession,type ReceiverSessionTransition} from './radioReceiverSession';

/** Web refusals, first failing gate in this order; a refusal carries no prepared output. */
export type PulsarListCommandRefusal='inactive'|'menu-hidden'|'menu-disabled'|'no-catalog'|'reading'|'modal'
 |'unavailable'|'close-box-open'|'record-dialog-open'|'pointing-invalid'|'prepare-failed';
export type PulsarListCommandInput=Readonly<{
 /** Route shown, no project operation, page visible (latest values). */
 host:Readonly<{active:boolean;busy:boolean;pageVisible:boolean}>;
 /** Latest PulsarList1 flags (R-RX7 history). Read only: the command never writes them. */
 menu:RadioPulsarListMenu;
 /** Admitted reference catalog (null: none) and whether a read is pending. */
 catalog:PulsarCatalog|null;reading:boolean;
 /** Another surface is open now: antenna box/dialog/hot list, date dialog, configuration box/dialog, a foreign native
  * <dialog> or a presented panel surface. The window's own Find/notice is checked here (pulsarParametersOpenRefusal). */
 modal:boolean;
 /** Latest receiver session (null: workspace unavailable) and latest Parameters window. */
 session:RadioReceiverSession|null;window:PulsarParametersWindow|null;
 /** Latest accepted antenna pointing (RA hours, Dec degrees); never invented. */
 pointing:RadioPointing;
 /** Radio clock scenario JD now, or null (WEB-PP-CLK-01). */
 clockJD:number|null;
}>;
export type PulsarListCommandPrepared=Readonly<{ok:true;
 /** The exact snapshots the preparation used; the caller commits only while both are still current. */
 before:Readonly<{session:RadioReceiverSession;window:PulsarParametersWindow|null}>;
 /** The buffer write (action 'pulsar-list') and the activated window. */
 session:ReceiverSessionTransition;window:PulsarParametersWindow;
 /** hit: a record was copied (its J2000 name is `name`); miss: the J2000 name was cleared (`name` null). */
 source:'hit'|'miss';name:string|null;
 /** The same-catalog window was reused (Find memory kept). */
 reused:boolean;
}>;
export type PulsarListCommandResult=Readonly<{ok:false;reason:PulsarListCommandRefusal}>|PulsarListCommandPrepared;

const refuse=(reason:PulsarListCommandRefusal):PulsarListCommandResult=>Object.freeze({ok:false,reason});

/**
 * WEB-PP-LIST-04 handler-time admission and preparation. Every gate runs on the supplied latest snapshot before anything
 * is computed; only then the buffer write and, from its post-write buffer, the activation. No receiver is created and no
 * random number is drawn, so an invalid receiver seed, a switched-off device or Tracking off are not gates here. No picker
 * cursor notification is produced: the activation's scan sets the final shared cursor. Inputs are never mutated.
 */
export function preparePulsarListCommand(i:PulsarListCommandInput):PulsarListCommandResult{
 if(!i.host.active||i.host.busy||!i.host.pageVisible)return refuse('inactive');
 if(!i.menu.visible)return refuse('menu-hidden');
 if(!i.menu.enabled)return refuse('menu-disabled');
 if(i.catalog===null||i.catalog.length===0)return refuse('no-catalog');
 if(i.reading)return refuse('reading');
 if(i.modal||pulsarParametersOpenRefusal(i.window)!==null)return refuse('modal');
 if(i.session===null)return refuse('unavailable');
 const box=receiverBoxRefusal(i.session);if(box!==null)return refuse(box);
 if(!Number.isFinite(i.pointing.ra)||!Number.isFinite(i.pointing.dec))return refuse('pointing-invalid');
 if(i.clockJD!==null&&!Number.isFinite(i.clockJD))return refuse('prepare-failed');
 const written=overwriteReceiverSourceBuffer(i.session,{catalog:i.catalog,pointing:i.pointing});
 const o=written.outcome;
 if(o.kind!=='ok'||o.action!=='pulsar-list'||!written.changed||written.host!==undefined)return refuse('prepare-failed');
 const event=o.events.find(e=>e.kind==='buffer-overwritten'||e.kind==='buffer-name-cleared');
 if(event===undefined)return refuse('prepare-failed');
 const activated=openPulsarParameters(i.window,i.catalog,pulsarSeedFromBuffer(written.session.bank.sourceBuffer),i.clockJD);
 if(!activated.changed||activated.window===null)return refuse('prepare-failed');
 return Object.freeze({ok:true,before:Object.freeze({session:i.session,window:i.window}),session:written,window:activated.window,
  source:event.kind==='buffer-overwritten'?'hit':'miss',name:event.kind==='buffer-overwritten'?event.name:null,reused:activated.outcome==='reopened'});
}
