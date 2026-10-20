/** OpenVireo JSON numeric-field codec. Decode only at typed numeric fields:
 * draft text "-0" must remain text, so this is deliberately not a JSON reviver.
 * Each owning reader still validates finiteness, units, range and precision. */
export function decodeSessionNumber(value:unknown):number{return value==='-0'?-0:typeof value==='number'?value:NaN;}
export function encodeSessionNumber(value:unknown):unknown{return typeof value==='number'&&Object.is(value,-0)?'-0':value;}
