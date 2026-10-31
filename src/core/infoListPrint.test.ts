import {describe,expect,it} from 'vitest';
import {infoListPrintPage,infoListPrintText} from './infoListPrint';

// Front R4b (dossier C §2 Q7–Q10).
describe('TInfoListForm1 print page (0x59e51c)',()=>{
 it('date + table line, +2H name1, +2H caption at x 50, +2H, then the lines at x 50',()=>{
  const page=infoListPrintPage({dateText:'D',caption:'CCD Camera Parameters',lines:['a','b']});
  expect(page).toEqual([{x:0,text:'D     Laboratory Table Number (Not Recorded)'},{x:0,text:''},{x:0,text:''},{x:0,text:''},
   {x:50,text:'CCD Camera Parameters'},{x:0,text:''},{x:50,text:'a'},{x:50,text:'b'}]);
  expect(infoListPrintText(page).slice(4)).toEqual(['     CCD Camera Parameters','','     a','     b']);
 });
 it('names 2–4 only when set, and a recorded table replaces (Not Recorded)',()=>{
  const page=infoListPrintPage({dateText:'D',caption:'C',lines:[],names:['Ann','','Bo'],table:'7'});
  expect(page.map(l=>l.text)).toEqual(['D     Laboratory Table Number 7','','Ann','Bo','','C','']);
 });
});
