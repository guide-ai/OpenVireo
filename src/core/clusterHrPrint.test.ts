import {describe,expect,it} from 'vitest';
import {clusterHrPrintPage} from './clusterHrPrint';

describe('HR Print page body 0x542fc8',()=>{
 const base={dateText:'D',zamsShown:true,modulusTicks:950,ebvTicks:3};
 it('portrait: date, students, the ZAMS block, the caption, then the window image one line below',()=>{
  const p=clusterHrPrintPage({...base,orientation:'portrait'});
  expect(p.lines.map(l=>[l.kind,l.text,l.x,l.gap])).toEqual([
   ['date','D     Laboratory Table Number (Not Recorded)',0,{h:0}],['students',null,0,{h:2}],
   ['zams','Fit of Zero-Age Main Sequence:',0,{h:2}],['modulus','V - Mv = 9.50',150,{h:1}],['ebv','E(B-V) = 0.03',150,{h:1}],
   ['caption','Color-Magnitude Diagram',0,{h:3}]]);
  expect([p.page2,p.imageGap]).toEqual([false,{h:1}]);
 });
 it('landscape: x0 = 50, the next-page line at x 700, then page 2 headed by name 1 and the image at y 70',()=>{
  const p=clusterHrPrintPage({...base,orientation:'landscape'});
  expect(p.lines.slice(-3).map(l=>[l.kind,l.text,l.suffix,l.x,l.gap])).toEqual([
   ['caption','Color-Magnitude Diagram',undefined,50,{h:3}],['next-page','(Screen Image Printed on Next Page)',undefined,700,{px:300}],['page-2',null,' - Page 2',50,{px:0}]]);
  expect(p.lines[3]).toMatchObject({kind:'modulus',x:200});
  expect([p.page2,p.imageGap]).toEqual([true,{px:70}]);
 });
 it('prints the ZAMS block only when the ZAMS is shown and V−Mv is not 0 (0x5431e3–0x543209)',()=>{
  for(const c of [{zamsShown:false,modulusTicks:950},{zamsShown:true,modulusTicks:0}])
   expect(clusterHrPrintPage({...base,...c,orientation:'portrait'}).lines.map(l=>l.kind)).toEqual(['date','students','caption']);
  expect(clusterHrPrintPage({...base,modulusTicks:1500,ebvTicks:250,orientation:'portrait'}).lines.slice(3,5).map(l=>l.text)).toEqual(['V - Mv = 15.00','E(B-V) = 2.50']);
 });
});
