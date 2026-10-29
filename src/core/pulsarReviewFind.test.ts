import {describe,expect,it} from 'vitest';
import {pulsarReviewFind,pulsarReviewMissText} from './pulsarReviewFind';

describe('Review ▸ Find 0x5634c8',()=>{
 const rows=['"B0329+54",610,"Pulse ONE"','"B0329+54",620,"pulse two"','"J0437-4715",630,"ÉTÉ"'];
 it('lowercases A–Z only and matches by substring from the start row, without wrap',()=>{
  expect(pulsarReviewFind(rows,'PULSE',0)).toBe(0);expect(pulsarReviewFind(rows,'pulse',1)).toBe(1);expect(pulsarReviewFind(rows,'pulse',2)).toBeNull();
  expect(pulsarReviewFind(rows,'été',0)).toBeNull();expect(pulsarReviewFind(rows,'ÉTÉ',0)).toBe(2);// non-ASCII letters keep their case
  expect(pulsarReviewFind(rows,'',0)).toBeNull();
 });
 it('miss text',()=>{expect(pulsarReviewMissText('xyz')).toBe('"xyz" Not Found.');});
});
