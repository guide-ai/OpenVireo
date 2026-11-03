/** Pure ports of the Delphi RTL text-file reading and token helpers that CLEA's line parsers use. Static reading of
 * CLEA_VEO.exe 781bc970…c54c (research analysis/front-lssparse/RECOVERY.md); nothing executed or emulated.
 * Bytes are ANSI and map one-to-one to UTF-16 code units (Latin-1), as the other list readers do. */

/** [D] Assign 0x403a20: 128-byte buffer (+0x8 = 0x80); Flags := DefaultTextLineBreakStyle byte 0x5ae034 = 1 (tfCRLF). */
export const NATIVE_TEXT_BUFFER_BYTES=128;
const CR=0x0d,LF=0x0a,EOF_MARK=0x1a;

/** The lines a `while not Eof(f) do Readln(f, S)` loop returns over a disk file, with tfCRLF set.
 * [D] Eof 0x403d88: true at the end of the data or when the next byte is ^Z (0x1a); a ^Z is never consumed by Eof or by
 *     the character reader 0x403f80.
 * [D] ReadLString 0x404084 (ShortString chunks of 255 through ReadString 0x403fec, concatenated, so a line has no length
 *     limit): stops before LF; a CR followed by LF stops before the CR; any other CR is dropped and reading goes on; a ^Z
 *     stops the line and is consumed when ReadString reads it from the current buffer, but not when it is the first byte of
 *     a refilled buffer (read through 0x403f80).
 * [D] ReadLn 0x4040f0: skips through the next LF (also CR LF), stopping without consuming at a ^Z or at the end.
 * [I] The buffer is refilled with whole 128-byte blocks (ReadFile on a disk file), so "first byte of a refilled buffer" is
 *     an offset that is a multiple of 128.
 * [D] A CR that is the last byte of a buffer peeks one byte past the data (0x40403a). After a full 128-byte block that byte
 *     is FormShow's [ebp-0x20] (TTextRec at ebp-0x1ec, 0x1cc bytes long): zeroed by the prologue loop 0x52ac27..0x52ac31 and
 *     written only after the read loop (0x52ae1e/0x52aecb), so it is not LF and the CR is dropped like any lone CR. After a
 *     short final block the peek reads stale buffer bytes, but the CR is then the last byte of the data and both outcomes
 *     reach the end with the same text. So the in-file next byte decides, as modelled. */
export function nativeTextFileLines(bytes:Uint8Array):string[]{
 const n=bytes.length,lines:string[]=[];let p=0;
 while(p<n&&bytes[p]!==EOF_MARK){
  let s='';
  for(;;){// ReadString
   if(p>=n)break;
   const b=bytes[p];
   if(b===LF)break;
   if(b===EOF_MARK){if(p%NATIVE_TEXT_BUFFER_BYTES!==0)p++;break;}
   if(b===CR){if(bytes[p+1]===LF)break;p++;continue;}
   s+=String.fromCharCode(b);p++;
  }
  for(;;){// ReadLn
   if(p>=n||bytes[p]===EOF_MARK)break;
   const b=bytes[p++];
   if(b===LF)break;
   if(b===CR){if(p>=n||bytes[p]===EOF_MARK)break;if(bytes[p]===LF){p++;break;}}
  }
  lines.push(s);
 }
 return lines;
}

/** [D] 0x4867fc (var S; Delim; out Token): delete leading ' ' and Delim characters; '' when nothing is left; otherwise the
 * first character is the quote, the token runs to the next occurrence of that character (or to the end), and the token,
 * the closing quote and one more character are deleted from S. */
export function takeQuotedToken(line:string,delimiter:string):[token:string,rest:string]{
 let i=0;while(i<line.length&&(line[i]===' '||line[i]===delimiter))i++;
 if(i>=line.length)return ['',''];
 const quote=line[i],end=line.indexOf(quote,i+1);
 return end<0?[line.slice(i+1),'']:[line.slice(i+1,end),line.slice(end+2)];
}

/** [D] 0x48690c (var S; Delim): Extended: delete leading ' ' and Delim characters; the token runs to the next Delim (or to
 * the end) and goes to StrToFloat 0x40cf60; only when that returns are the token and one more character deleted from S.
 * This returns the token and the rest after the deletion; the conversion is the caller's. */
export function cutFloatToken(line:string,delimiter:string):[token:string,rest:string]{
 let i=0;while(i<line.length&&(line[i]===' '||line[i]===delimiter))i++;
 const s=line.slice(i),p=s.indexOf(delimiter),n=p<0?s.length:p;
 return [s.slice(0,n),s.slice(n+1)];
}

/** StrToFloat 0x40cf60 → TextToFloat 0x40cdb4 lexical acceptance, as a decimal spelling for the web's conversion.
 * [D] The text ends at the first NUL (PChar); leading ' ' skipped; optional '+'/'-'; digits; optionally the DecimalSeparator
 *     (byte 0x5b880f) and digits; at least one digit or the separator must have been read; optionally an exponent marker,
 *     a byte b with (b and 0xdf) = 0x45 (0x40ce0f..0x40ce13: 8-bit AL, so only 'E' and 'e'; bit 7 survives the mask, so
 *     0xc5 'Å' and 0xe5 'å' give 0xc5 and are not markers), an optional
 *     sign and digits, read while the exponent stays below 500 (0x1f4), so digits can be left over; trailing ' ' skipped;
 *     then the text must have ended. TextToFloat also fails when the Extended result sets the invalid or overflow flag
 *     (FPU status & 9); StrToFloat then raises EConvertError with resource 0xfff1 (`STR_TO_FLOAT_ERROR`).
 * [U] The DecimalSeparator is the host locale's; [W] the web uses '.'.
 * Returns null where TextToFloat fails lexically, otherwise a JavaScript-parsable decimal of the same value. */
export function nativeFloatSpelling(text:string,decimalSeparator='.'):string|null{
 const s=text.split('\0')[0];let i=0;
 while(s[i]===' ')i++;
 let sign='';if(s[i]==='+'||s[i]==='-')sign=s[i++];
 const start=i;let whole='',fraction='';
 while(i<s.length&&s[i]>='0'&&s[i]<='9')whole+=s[i++];
 if(s[i]===decimalSeparator){i++;while(i<s.length&&s[i]>='0'&&s[i]<='9')fraction+=s[i++];}
 if(i===start)return null;
 let exponent=0;
 if(((s.charCodeAt(i)|0)&0xdf)===0x45){
  i++;let negative=false;if(s[i]==='+'||s[i]==='-')negative=s[i++]==='-';
  while(i<s.length&&s[i]>='0'&&s[i]<='9'){exponent=exponent*10+Number(s[i++]);if(exponent>=500)break;}
  if(negative)exponent=-exponent;
 }
 while(s[i]===' ')i++;
 if(i<s.length)return null;
 return `${sign}${whole||'0'}.${fraction||'0'}e${exponent}`;
}

/** [D] SInvalidFloat, resource string 0xfff1 (PResStringRec 0x4092d0, referenced at 0x5b5650 by StrToFloat 0x40cf60):
 * "'%s' is not a valid floating point value", formatted with the whole text passed to StrToFloat. */
export const strToFloatErrorText=(text:string)=>`'${text}' is not a valid floating point value`;
