import {expect,it} from 'vitest';
import {tickFractionDigits} from './tickLabel';
it('labels a 1000 Å window in whole ångströms and keeps decimals when zoomed in',()=>{
 expect(tickFractionDigits({minimum:3700,maximum:4700})).toBe(0);
 expect(tickFractionDigits({minimum:3700,maximum:3762.5})).toBe(0);
 expect(tickFractionDigits({minimum:3700,maximum:3730})).toBe(1);
 expect(tickFractionDigits({minimum:3700,maximum:3701})).toBe(2);
 expect(tickFractionDigits({minimum:3700,maximum:3700.3})).toBe(3);
});
