import {describe,it,expect} from 'vitest';
import {decideLocale,HTML_LANG,SPANISH_RELEASED,type LocaleInputs} from './locale';
const decide=(over:Partial<LocaleInputs>)=>decideLocale({param:null,stored:null,languages:['en-US'],released:true,dev:false,...over});
describe('Front ES0: the language of one load (user decisions 1 and 5, 2026-11-09)',()=>{
 it('keeps Spanish hidden before ES-REL: only the ?lang=es-419 preview reaches it',()=>{
  expect(SPANISH_RELEASED).toBe(false);
  for(const languages of [['es-MX'],['es'],['es-ES'],['es-419','en']])expect(decide({languages,released:false})).toBe('en');
  expect(decide({stored:'es-419',languages:['es-MX'],released:false})).toBe('en');
  expect(decide({param:'es-419',released:false})).toBe('es-419');
  expect(decide({param:'en',languages:['es-MX'],released:false})).toBe('en');
 });
 it('after ES-REL: the link parameter, then the stored choice, then the first browser language',()=>{
  for(const languages of [['es-MX'],['es'],['es-ES'],['ES-ar'],['es-419','en']])expect(decide({languages})).toBe('es-419');
  for(const languages of [['en-US','es-MX'],['fr-FR'],['et'],['eus'],[]])expect(decide({languages})).toBe('en');
  expect(decide({stored:'en',languages:['es-MX']})).toBe('en');
  expect(decide({stored:'es-419',languages:['en-US']})).toBe('es-419');
  expect(decide({param:'en',stored:'es-419',languages:['es-MX']})).toBe('en');
  expect(decide({param:'es-419',stored:'en'})).toBe('es-419');
  for(const junk of ['es','ES-419','qps','de',''])expect(decide({param:junk,stored:junk,languages:['en-US']})).toBe('en');
 });
 it('accepts the pseudo-locale only in the dev server and tests, never from storage',()=>{
  expect(decide({param:'qps'})).toBe('en');expect(decide({param:'qps',dev:true,released:false})).toBe('qps');
  expect(decide({stored:'qps',dev:true})).toBe('en');
  expect(HTML_LANG).toEqual({en:'en','es-419':'es-419',qps:'en'});
 });
});
