import {describe,expect,it} from 'vitest';
import {RADIO_ADD_CURRENT_COMPILED,radioAddCurrentFields} from './radioAddCurrent';
import {INITIAL_RADIO_LAB,receiverOneOpened} from './radioAntenna';
import type {PulsarRecord} from './radioPulsarCatalog';

const P={primaryName:'J0332+5434',legacyName:'B0329+54',ra:3.5,dec:54.5} as unknown as PulsarRecord;
const here={ra:3.6,dec:54.6};
describe('PListAddClick 0x567c5c record (Front R1)',()=>{
 it('compiled options: B1950 name, current pointing, no remarks',()=>{
  expect(RADIO_ADD_CURRENT_COMPILED).toEqual({exactPosition:false,pulsarIdentification:1});
  expect(radioAddCurrentFields(here,P)).toEqual({id:'B0329+54',remarks:'',ra:3.6,dec:54.6});
 });
 it('Exact Pos takes the catalogue position only with a pulsar in the buffer; Pulsar ID 0/2; an empty buffer gives an empty ID',()=>{
  expect(radioAddCurrentFields(here,P,{exactPosition:true,pulsarIdentification:2})).toEqual({id:'J0332+5434',remarks:'',ra:3.5,dec:54.5});
  expect(radioAddCurrentFields(here,null,{exactPosition:true,pulsarIdentification:1})).toEqual({id:'',remarks:'',ra:3.6,dec:54.6});
  expect(radioAddCurrentFields(here,P,{exactPosition:false,pulsarIdentification:0}).id).toBe('');
 });
 it('Object X: the hidden label replaces the pulsar name wherever the pointing is (review M2), even with Exact Pos',()=>{
  expect(radioAddCurrentFields({ra:10,dec:-20},P,undefined,'ObjX-7')).toEqual({id:'ObjX-7',remarks:'',ra:10,dec:-20});
  expect(radioAddCurrentFields(here,null,undefined,'ObjX-7').id).toBe('ObjX-7');
 });
 it('a receiver miss (empty primary name) keeps the pointing under Exact Pos; the ID is not trimmed, only cut to 24',()=>{
  const miss={...P,primaryName:''} as PulsarRecord;
  expect(radioAddCurrentFields(here,miss,{exactPosition:true,pulsarIdentification:1})).toEqual({id:'B0329+54',remarks:'',ra:3.6,dec:54.6});
  expect(radioAddCurrentFields(here,{...P,legacyName:' B0329+54 '} as PulsarRecord).id).toBe(' B0329+54 ');
  expect(radioAddCurrentFields(here,{...P,legacyName:'X'.repeat(30)} as PulsarRecord).id).toHaveLength(24);
 });
 it('Rcvr1BtnClick 0x567a83 enables +0x480; a second open changes nothing',()=>{
  expect(INITIAL_RADIO_LAB.addToListEnabled).toBe(false);
  const t=receiverOneOpened(INITIAL_RADIO_LAB);expect(t.state.addToListEnabled).toBe(true);expect(t.changed).toBe(true);
  expect(receiverOneOpened(t.state).changed).toBe(false);
 });
});
