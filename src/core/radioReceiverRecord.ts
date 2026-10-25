// R-RX4 Record → Identify → Properties → Save question (docs/RADIO-RECEIVER-RECORD.md). CLEA_VEO.exe SHA-256 781bc970…c54c.
// Pure TypeScript: literals with their VAs, the MessageBox flags, the Identify (TStrIpDlg) admission and the conversion of a
// finished capture into the shared current-dataset input. No React, DOM, clock, RNG, audio or storage.
import type {RadioRecordHeader} from './radioReceiver';

/** NUL-terminated ASCII spans (receiver-record LITERALS.json). Shown verbatim, not translated. */
export const RADIO_RECORD_LITERALS=Object.freeze({
 /** 0x575958 / 0x5759dc, MessageBox flags 0x13 (Yes/No/Cancel, stop icon). */
 unsavedText:'You have not saved your previously recorded data!  You will lose the previous data if you record now.\r\n\r\nSave previous data now?',
 unsavedCaption:'Recorded Data Not Saved!',
 /** 0x575a08 / 0x5759f8, flags 0x41 (OK/Cancel, information icon; default OK). */
 eraseText:'Deleting Previously Recorded Data From Memory',eraseCaption:'Erasing Data',
 /** 0x573e38 / 0x573e24, flags 0x40 (OK). The literal says 1600; the append bound admits 1601 triples (RC-REC-07). */
 fullText:'Data Recording Was Terminated at 1600 Points.',fullCaption:'Data Buffer Filled',
 /** 0x573e70 TStrIpDlg caption (+0x374) and 0x573e94 Label1 (+0x378). */
 identifyCaption:'Identify Recorded Object',identifyLabel:'Enter/Verify Name or ID of Object',
 /** 0x573ec0 / 0x573f4c, flags 0x23 (Yes/No/Cancel, question icon). */
 saveText:'You must save your data if you don\'t plan to analyze it immediately.\r\n\r\nSave the current recorded data now?\r\n("No" -> Open Analysis Window)',
 saveCaption:'Save Data Now?',
});
export const RADIO_RECORD_FLAGS=Object.freeze({unsaved:0x13,erase:0x41,full:0x40,save:0x23});
/** [D] TSTRIPDLG DFM (resource f20d3149…98a2): OK bkOK (TabOrder 1), Cancel bkCancel (2), EditStr (0, ActiveControl),
 * BorderIcons []. [I] bkOK Default / bkCancel Cancel follow inherited VCL TBitBtn Kind semantics (not captured here). */
export const RADIO_IDENTIFY_DFM=Object.freeze({ok:'OK',cancel:'Cancel'});
/** WEB-REC-ID: 0..40 printable ASCII characters; the caller passes 40 to 0x43c450 (read as MaxLength, inferred) and the
 * OK copy-back is ShortString[40] (0x573cf1). Longer or other text is refused in the dialog, never truncated. */
export const RADIO_IDENTIFY_POLICY=Object.freeze({maxLength:40,draftLimit:256});
export type RadioIdentifyIssue='length'|'text';
export function radioIdentifyIssue(text:string):RadioIdentifyIssue|null{
 if(text.length>RADIO_IDENTIFY_POLICY.maxLength)return 'length';
 return /^[\x20-\x7e]*$/.test(text)?null:'text';
}

/** A capture taken from the bank at the finish or at the main close. */
export type RadioRecordCapture=Readonly<{captureId:number;header:RadioRecordHeader;rows:readonly number[];full:boolean}>;
/** The shared-dataset input of a capture with the final name (Identify OK copy-back, or the unchanged header name). null when
 * a cell that Receive always writes is missing (no Receive happened: nothing to commit). */
export function radioCaptureInput(c:RadioRecordCapture,name:string){
 const h=c.header;
 if(h.aperture===null||h.highestIndex===null||h.start===null||h.interval===null)return null;
 return Object.freeze({captureId:c.captureId,name,aperture:h.aperture,highestIndex:h.highestIndex,frequencies:h.frequencies,gains:h.gains,start:h.start,interval:h.interval,
  rows:c.rows,full:c.full});
}
