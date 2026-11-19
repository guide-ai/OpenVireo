import {describe,expect,it} from 'vitest';
import {foreignDigits,insertedText,QUOTED_DIGITS,watchedField,type FieldLike} from './numericDigits';
// Front HI0: the pure half of the digit notice (src/components/DigitNotice.tsx; the browser half is tests/digit-notice.spec.ts).
describe('foreignDigits',()=>{
 it.each([
  ['12.5',''],['-0.25e3',''],['2009-06-01 04:00',''],['NGC 4670',''],['',''],
  ['१२.५','१२५'],['१२३४५६७८९०','१२३४५६'],['１２．５','１２５'],['٣٫١٤','٣١٤'],['۱۲','۱۲'],['১২','১২'],['12 and ४२','४२'],
  ['१1१','१'],
 ])('%j → %j',(text,digits)=>expect(foreignDigits(text)).toBe(digits));
 it('quotes at most QUOTED_DIGITS distinct digits, in order of appearance',()=>{
  expect(foreignDigits('९८७६५४३२१०')).toHaveLength(QUOTED_DIGITS);
  expect(foreignDigits('९९८८')).toBe('९८');
 });
 it('ignores numerals that are not decimal digits (superscripts, Roman, fractions)',()=>expect(foreignDigits('x² Ⅻ ½ ①')).toBe(''));
});
describe('watchedField',()=>{
 const field=(over:Partial<FieldLike>&{optOut?:boolean}={}):FieldLike=>({tagName:'INPUT',type:'text',readOnly:false,disabled:false,closest:()=>over.optOut?{}:null,...over});
 it.each(['text','search','number','tel'])('watches type=%s',type=>expect(watchedField(field({type}))).not.toBeNull());
 it.each(['email','url','password','checkbox','radio','range','date','file'])('ignores type=%s',type=>expect(watchedField(field({type}))).toBeNull());
 it('ignores read-only, disabled and opted-out fields, textareas and other targets',()=>{
  expect(watchedField(field({readOnly:true}))).toBeNull();
  expect(watchedField(field({disabled:true}))).toBeNull();
  expect(watchedField(field({optOut:true}))).toBeNull();
  expect(watchedField(field({tagName:'TEXTAREA'}))).toBeNull();
  expect(watchedField(null)).toBeNull();
  expect(watchedField({} as EventTarget)).toBeNull();
 });
});
describe('insertedText',()=>{
 it('reads typed data, then pasted or dropped plain text',()=>{
  expect(insertedText({data:'४',dataTransfer:null})).toBe('४');
  expect(insertedText({data:null,dataTransfer:{getData:(t:string)=>t==='text/plain'?'１２':''} as DataTransfer})).toBe('１２');
  expect(insertedText({data:null,dataTransfer:null})).toBe('');
 });
});
