import {describe,expect,it} from 'vitest';
import {lightCurvePrintPage,LIGHT_CURVE_PRINT_LITERALS as L} from './lightCurvePrint';
import {INITIAL_LIGHT_CURVE_MONOCHROME,LIGHT_CURVE_SCHEMES,lightCurvePrintFlags,lightCurveScheme} from './lightCurveScheme';

// Front R4b (analysis/front-plans/front-r4b.md §1; dossier B §1, §3, §4a).
describe('light-curve schemes and the display-flag lifetime',()=>{
 it('colour is navy/white/yellow, B&W is white/black/black; the flag starts colour and only Print writes it',()=>{
  expect(LIGHT_CURVE_SCHEMES.colour).toEqual({background:'#000080',ink:'#ffffff',curve:'#ffff00'});
  expect(lightCurveScheme(true)).toEqual({background:'#ffffff',ink:'#000000',curve:'#000000'});
  expect(INITIAL_LIGHT_CURVE_MONOCHROME).toBe(false);
  expect(lightCurvePrintFlags({monochromeDisplays:true,printInColor:false})).toEqual({printMonochrome:true,displayMonochromeAfter:true});
  expect(lightCurvePrintFlags({monochromeDisplays:false,printInColor:true})).toEqual({printMonochrome:false,displayMonochromeAfter:false});
 });
});
describe('light-curve print page (0x52c250)',()=>{
 const lines=['a','b','c'];
 const pos=(p:ReturnType<typeof lightCurvePrintPage>)=>p.map(i=>i.kind==='text'?[i.role,i.page,i.x,i.yH,i.yUnits,i.text]:['image',i.page,i.x,i.yH]);
 it('portrait: date, name1 at 2H, the list at x 50 from +4H, then +H, +3H and the title and image on page 1',()=>{
  expect(pos(lightCurvePrintPage({orientation:'portrait',dateText:'D',listLines:lines}))).toEqual([
   ['date',1,0,0,0,'D'+L.tableNumber+L.notRecorded],['name',1,0,2,0,''],['line',1,50,6,0,'a'],['line',1,50,7,0,'b'],['line',1,50,8,0,'c'],
   ['title',1,0,13,0,L.title],['image',1,0,14]]);
 });
 it('11 lines and no extra names put the portrait title at 21H (dossier B §4a); each non-empty extra name adds H',()=>{
  const eleven=Array.from({length:11},(_,i)=>String(i));
  const title=(names?:string[])=>lightCurvePrintPage({orientation:'portrait',dateText:'D',listLines:eleven,names}).find(i=>i.kind==='text'&&i.role==='title');
  expect(title()).toMatchObject({yH:21,page:1});
  expect(title(['Ann','','Bo','Cy'])).toMatchObject({yH:23});
 });
 it('landscape: +300 units and the next-page line at x 700, then page 2 with name1 - Page 2 at (0,0) and the title at H',()=>{
  const p=lightCurvePrintPage({orientation:'landscape',dateText:'D',listLines:lines,names:['Ann','','Bo']});
  expect(p.filter(i=>i.kind==='text'&&i.role==='name').map(i=>i.kind==='text'&&[i.text,i.yH])).toEqual([['Ann',2],['Bo',3]]);
  expect(pos(p).slice(-4)).toEqual([['next-page',1,700,11,300,L.nextPage],['page2',2,0,0,0,'Ann - Page 2'],['title',2,0,1,0,L.title],['image',2,0,2]]);
 });
 it('the page-2 name is a ShortString of at most 49 characters',()=>{
  const p=lightCurvePrintPage({orientation:'landscape',dateText:'D',listLines:[],names:['x'.repeat(45)]});
  expect(p.find(i=>i.kind==='text'&&i.role==='page2')).toMatchObject({text:'x'.repeat(45)+' - P'});
 });
});
