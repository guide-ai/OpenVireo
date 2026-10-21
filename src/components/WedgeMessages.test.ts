import{describe,expect,it}from'vitest';
import{createElement}from'react';
import{renderToStaticMarkup}from'react-dom/server';
import{WEDGE_NATIVE_TEXT as N}from'../core/wedgeNativeText';
import{WEDGE_DEFAULT_OPTIONS}from'../core/wedgePlot';
import WedgeLab,{type WedgeLabProps}from'./WedgeLab';
import{WEDGE_MESSAGES,WEDGE_NATIVE_CAPTIONS,wedgeMessages,type WedgeMessageOverrides}from'./WedgeMessages';
import WedgeOptionsDialog from'./WedgeOptionsDialog';
// Placeholder translations for the contract only (not a reviewed Spanish catalog).
// The first two lines are the coordinator's TS2322 reproduction; `tsc` (typecheck and
// build) compiles this file, so a return to literal-narrowed types fails there.
const reproduction:WedgeLabProps={messages:{intro:'Datos guardados',statusEmpty:'Sin datos'}};
const es={
 intro:'Datos guardados',statusEmpty:'Sin datos',persistenceNote:'Solo en esta ventana.',
 statusLoaded:(records:number,files:number)=>`${records} registros de ${files} archivos`,
 columns:{object:'Objeto'},schemes:['Colores','Blanco y negro'],
 native:{windowCaption:'Diagrama de cuña LSS',menuPlotData:'Graficar datos',yes:'Sí',no:'No',cancel:'Cancelar',ok:'Aceptar',
  retainCaption:'¿Conservar los datos actuales?',loadedText:(name:string)=>`Archivo «${name}» cargado.`,
  gridItems:['Velocidad','Corrimiento al rojo (Z)','Sin cuadrícula'],optionsCaption:'Opciones del diagrama'},
}satisfies WedgeMessageOverrides;
const props:WedgeLabProps={messages:es};
// Type guards in the other direction: overrides stay checked, not `any`.
// @ts-expect-error unknown key
const unknownKey:WedgeMessageOverrides={introduction:'x'};
// @ts-expect-error a message string cannot be replaced by a number
const wrongKind:WedgeMessageOverrides={statusEmpty:1};
// @ts-expect-error GridGrp has exactly three items
const shortGrid:WedgeMessageOverrides={native:{gridItems:['a','b']}};
// @ts-expect-error a formatter keeps its parameter type
const wrongFormatter:WedgeMessageOverrides={native:{loadedText:(n:number)=>String(n)}};
void[unknownKey,wrongKind,shortGrid,wrongFormatter];

describe('LSS wedge presentation catalog',()=>{
 it('accepts translated strings, nested groups, tuples and formatters with English defaults',()=>{
  expect(reproduction.messages?.intro).toBe('Datos guardados');
  const m=wedgeMessages(props.messages);
  expect([m.intro,m.statusEmpty,m.statusLoaded(2,1),m.columns.object,m.columns.ra]).toEqual(['Datos guardados','Sin datos','2 registros de 1 archivos','Objeto','RA']);
  expect([m.native.yes,m.native.no,m.native.cancel,m.native.retainCaption,m.native.loadedText('a.txt')]).toEqual(['Sí','No','Cancelar','¿Conservar los datos actuales?','Archivo «a.txt» cargado.']);
  // Untranslated native captions keep the verbatim original.
  expect([m.native.deleteCaption,m.native.retainText,m.native.headerText('f')]).toEqual([N.deleteCaption,N.retainText,N.headerText('f')]);
  expect(wedgeMessages()).toBe(WEDGE_MESSAGES);expect(Object.isFrozen(m)&&Object.isFrozen(m.native)).toBe(true);
 });
 it('declares translatable units and a row-count label (used by the table, details and prompt)',()=>{
  expect([WEDGE_MESSAGES.detail.hours,WEDGE_MESSAGES.detail.degrees,WEDGE_MESSAGES.rowCount(1),WEDGE_MESSAGES.rowCount(2)]).toEqual(['h','°','1 data row','2 data rows']);
  const m=wedgeMessages({detail:{hours:'hr'},rowCount:(n:number)=>`${n} filas`});
  expect([m.detail.hours,m.detail.degrees,m.rowCount(2)]).toEqual(['hr','°','2 filas']);
 });
 it('keeps the source-evidence literals verbatim and ignores malformed untyped overrides',()=>{
  wedgeMessages(es);
  expect(N.yes).toBe('Yes');expect(N.retainCaption).toBe('Retain Current Data?');expect(N.gridItems).toEqual(['Velocity','Red Shift (Z)','No Grid']);
  for(const k of Object.keys(WEDGE_NATIVE_CAPTIONS)as(keyof typeof WEDGE_NATIVE_CAPTIONS)[]){
   const v=WEDGE_NATIVE_CAPTIONS[k],n=(N as Record<string,unknown>)[k];
   expect(Array.isArray(v)?[...v]:v).toEqual(Array.isArray(n)?[...n]:n);
  }
  const loose=JSON.parse('{"statusEmpty":null,"intro":7,"columns":"x","native":{"gridItems":["only one"],"yes":"Sí","bogus":"x"},"nope":"x"}');
  const m=wedgeMessages(loose as WedgeMessageOverrides);
  expect([m.statusEmpty,m.intro,m.columns,m.native.gridItems,m.native.yes]).toEqual([WEDGE_MESSAGES.statusEmpty,WEDGE_MESSAGES.intro,WEDGE_MESSAGES.columns,WEDGE_NATIVE_CAPTIONS.gridItems,'Sí']);
  expect('bogus'in m.native||'nope'in m).toBe(false);
 });
 it('renders translated captions in the panel and options dialog, plus the persistence warning',()=>{
  const html=renderToStaticMarkup(createElement(WedgeLab,props));
  for(const t of['Diagrama de cuña LSS','Graficar datos','Datos guardados','Sin datos','Solo en esta ventana.'])expect(html).toContain(t);
  for(const t of['LSS Wedge Plot</h2>','No LSS data loaded.','>Plot Data<'])expect(html).not.toContain(t);
  const english=renderToStaticMarkup(createElement(WedgeLab));
  expect(english).toContain(WEDGE_MESSAGES.persistenceNote);expect(WEDGE_MESSAGES.persistenceNote).toMatch(/not included in Save investigation/);
  expect(WEDGE_MESSAGES.persistenceNote).toMatch(/reloaded or closed/);expect(WEDGE_MESSAGES.persistenceNote).toMatch(/loaded again/);
  const dialog=renderToStaticMarkup(createElement(WedgeOptionsDialog,{draft:WEDGE_DEFAULT_OPTIONS,idPrefix:'t-',captions:wedgeMessages(es).native,autoPlotNote:'-',onChange:()=>{},onOk:()=>{},onCancel:()=>{}}));
  for(const t of['Opciones del diagrama','Velocidad','Sin cuadrícula','Aceptar','Cancelar','Open'])expect(dialog).toContain(t);
  expect(dialog).not.toContain('Wedge Plot Options');
 });
});
