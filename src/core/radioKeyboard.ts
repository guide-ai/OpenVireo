/** RA-19 TRadioLab FormKeyDown 0x5680c4 / FormKeyUp 0x5681dc keyboard table (VIREO 1.504 CLEA_VEO.exe, SHA-256
 * 781bc970…c54c), decoded from the entry-aligned listings and the typed 51-byte lookup tables 0x568101/0x568213 (one
 * shared SHA-256 a4e0d61d…; docs/RADIO-ANTENNA-PROVENANCE.json RA-19). Pure TypeScript: no React, DOM or state.
 *
 * Native order (both handlers): Word [Key] = 0x65 exits first (0x5680cd / 0x5681df), then the manual-press latch +0x5d2
 * (KeyDown needs it clear, KeyUp needs it set), then idx := Key − 69 with an unsigned `ja` above 50, then the byte
 * lookup and the jump table. KeyDown cases call virtual +0xd4 on the button (TButton/TWinControl VMT slot → 0x46601c,
 * a SetFocus method; its form branch 0x477f18 for disabled or hidden controls is not closed) and then the button's
 * MouseDown; KeyUp cases call the MouseUp directly (no +0xd4). Both pass Button 0 (mbLeft), X = Y = 1, the Shift byte
 * (never read by any MouseDown/MouseUp), Self and the original Sender. Key is never zeroed, so VCL default processing
 * continues (not modelled). Keys follow the buttons, not their captions: VK 'N' always reaches NBtn (+0x438).
 *
 * The browser part (browserVirtualKey) is an OpenVireo web assumption (WEB-KEY-02), not a recovered mapping. */
import type {ManualDirection} from './radioAntenna';

export const RA19_TABLE_FIRST_VK=69;
export const RA19_TABLE_LAST_VK=119;
/** Tested before the latch and the table in both handlers; the table itself maps it to E (unreachable). */
export const RA19_IGNORED_VK=0x65;
/** The 12 non-default table cells (lookup index 1 S, 2 E, 3 W, 4 N); every other Word in 69..119 is index 0 (exit). */
export const RA19_KEY_DIRECTIONS:Readonly<Record<number,ManualDirection>>=Object.freeze({
 69:'east',78:'north',83:'south',87:'west',98:'south',100:'east',
 101:'east',// unreachable: the 0x65 guard exits first
 102:'west',104:'north',110:'north',115:'south',119:'west',
});
/** Case blocks and the handlers they call (KeyDown: +0xd4 then MouseDown; KeyUp: MouseUp only). */
export const RA19_CASES=Object.freeze({
 down:Object.freeze({south:Object.freeze({caseAddress:'0x568148',handler:'0x5663c4'}),east:Object.freeze({caseAddress:'0x56816c',handler:'0x5664e8'}),
  west:Object.freeze({caseAddress:'0x568190',handler:'0x566634'}),north:Object.freeze({caseAddress:'0x5681b4',handler:'0x5662a0'})}),
 up:Object.freeze({south:Object.freeze({caseAddress:'0x56825a',handler:'0x56645c'}),east:Object.freeze({caseAddress:'0x56826c',handler:'0x56658c'}),
  west:Object.freeze({caseAddress:'0x56827e',handler:'0x5666dc'}),north:Object.freeze({caseAddress:'0x568290',handler:'0x566338'})}),
});
export type Ra19Phase='down'|'up';
export type Ra19Dispatch=Readonly<
 |{kind:'ignored-vk-0x65'}
 /** KeyDown while latched or KeyUp while clear. */
 |{kind:'latch'}
 /** idx = Key − 69 above 50 (unsigned): Key < 69 or Key > 119. */
 |{kind:'outside-table'}
 /** Lookup index 0: the default case (0x5681d6 / 0x5682a0) returns. */
 |{kind:'table-default'}
 |{kind:'press'|'release';direction:ManualDirection;virtualD4:boolean;caseAddress:string;handler:string}
>;

const freeze=Object.freeze;
const isWord=(v:unknown):v is number=>typeof v==='number'&&Number.isInteger(v)&&v>=0&&v<=0xffff;

/** The direction a table key reaches, or null (outside the table, a default cell or the ignored 0x65). */
export function ra19TableDirection(vk:number):ManualDirection|null{
 if(!isWord(vk)||vk===RA19_IGNORED_VK)return null;
 return Object.hasOwn(RA19_KEY_DIRECTIONS,vk)?RA19_KEY_DIRECTIONS[vk]:null;
}

/** One native FormKeyDown/FormKeyUp entry in source order. `vk` must be a Word (integer 0..0xFFFF), `phase` 'down' or
 * 'up' and `latched` a boolean; anything else throws (no wrapping or coercion). The Shift byte is not an argument: no
 * MouseDown/MouseUp reads it. */
export function ra19Dispatch(vk:number,phase:Ra19Phase,latched:boolean):Ra19Dispatch{
 if(!isWord(vk)||(phase!=='down'&&phase!=='up')||typeof latched!=='boolean')throw new Error('Invalid RA-19 key input');
 if(vk===RA19_IGNORED_VK)return freeze({kind:'ignored-vk-0x65'});
 if(phase==='down'?latched:!latched)return freeze({kind:'latch'});
 if(vk<RA19_TABLE_FIRST_VK||vk>RA19_TABLE_LAST_VK)return freeze({kind:'outside-table'});
 const direction=Object.hasOwn(RA19_KEY_DIRECTIONS,vk)?RA19_KEY_DIRECTIONS[vk]:null;
 if(!direction)return freeze({kind:'table-default'});
 const c=RA19_CASES[phase][direction];
 return freeze({kind:phase==='down'?'press':'release',direction,virtualD4:phase==='down',caseAddress:c.caseAddress,handler:c.handler});
}

/** The DOM fields browserVirtualKey reads (KeyboardEvent.key, code, location, modifier state, isComposing). keyCode,
 * which and charCode are never read. */
export type BrowserKeyInput=Readonly<{key:string;code:string;location:number;ctrlKey:boolean;altKey:boolean;metaKey:boolean;altGraph:boolean;isComposing:boolean}>;
export type BrowserKeyRefusal='invalid-shape'|'composition'|'modifier'|'reserved-function-key'|'unmapped';
export type BrowserVirtualKey=Readonly<{vk:number}|{refused:BrowserKeyRefusal;vk:number|null}>;
/** KeyboardEvent.location DOM_KEY_LOCATION_STANDARD / NUMPAD. */
const STANDARD=0,NUMPAD=3;
const LETTER=/^[A-Za-z]$/,FUNCTION_KEY=/^F([1-9]|1[0-2])$/,NUMPAD_DIGIT=/^Numpad([0-9])$/;
const MAX_IDENTITY=64;

/** WEB-KEY-02 (OpenVireo assumption, not a runtime oracle): the Windows virtual key a browser key event stands for.
 * - an ASCII letter in `key` (either case, standard location, any non-empty physical `code`): VK 65 + letter index. The
 *   letter follows the layout's interpreted key; `code` is only the physical identity of a hold, not a fixed US mapping;
 * - numeric keypad with NumLock on: location 3, `code` NumpadN and `key` the same digit → VK 96 + N; location 3,
 *   `code` NumpadDecimal and `key` '.' or ',' → VK 110 (VK_DECIMAL). NumLock off gives navigation keys (ArrowUp,
 *   Delete…), which are unmapped, as their Windows VKs are outside the table;
 * - F1…F12 (`key` and `code` equal) are recognised (VK 112…123) and refused as reserved function keys;
 * - keydown only: Ctrl, Alt, Meta or AltGraph held refuses (a new hold never starts under a modifier); key releases
 *   ignore modifiers, so a release is never lost to one;
 * - composition (isComposing, Process), Dead, Unidentified, the digit row, arrows, non-Latin characters and an empty
 *   `code` are unmapped. */
export function browserVirtualKey(e:BrowserKeyInput,phase:Ra19Phase):BrowserVirtualKey{
 const shapeOk=!!e&&typeof e==='object'&&typeof e.key==='string'&&typeof e.code==='string'&&e.key.length<=MAX_IDENTITY&&e.code.length<=MAX_IDENTITY
  &&Number.isInteger(e.location)&&e.location>=0&&e.location<=3&&typeof e.ctrlKey==='boolean'&&typeof e.altKey==='boolean'&&typeof e.metaKey==='boolean'
  &&typeof e.altGraph==='boolean'&&typeof e.isComposing==='boolean'&&(phase==='down'||phase==='up');
 if(!shapeOk)return freeze({refused:'invalid-shape',vk:null});
 if(e.isComposing||e.key==='Process')return freeze({refused:'composition',vk:null});
 if(phase==='down'&&(e.ctrlKey||e.altKey||e.metaKey||e.altGraph))return freeze({refused:'modifier',vk:null});
 if(e.code==='')return freeze({refused:'unmapped',vk:null});
 const fn=FUNCTION_KEY.exec(e.key);
 if(fn&&e.code===e.key)return freeze({refused:'reserved-function-key',vk:111+Number(fn[1])});
 if(LETTER.test(e.key)&&e.location===STANDARD)return freeze({vk:e.key.toUpperCase().charCodeAt(0)});
 if(e.location===NUMPAD){
  const digit=NUMPAD_DIGIT.exec(e.code);
  if(digit&&e.key===digit[1])return freeze({vk:96+Number(digit[1])});
  if(e.code==='NumpadDecimal'&&(e.key==='.'||e.key===','))return freeze({vk:110});
 }
 return freeze({refused:'unmapped',vk:null});
}

export type BrowserTableKey=Readonly<
 |{kind:'refused';reason:BrowserKeyRefusal;vk:number|null}
 /** admitted: the key reaches a direction button (a table direction other than the ignored 0x65). The panel prevents
  * the default action only for admitted keys. */
 |{kind:'decoded';vk:number;admitted:boolean;dispatch:Ra19Dispatch}
>;
/** browserVirtualKey, then ra19Dispatch with the current latch: one direction table for both the core and the browser. */
export function browserTableKey(e:BrowserKeyInput,phase:Ra19Phase,latched:boolean):BrowserTableKey{
 const v=browserVirtualKey(e,phase);
 if('refused' in v)return freeze({kind:'refused',reason:v.refused,vk:v.vk});
 return freeze({kind:'decoded',vk:v.vk,admitted:ra19TableDirection(v.vk)!==null,dispatch:ra19Dispatch(v.vk,phase,latched)});
}
