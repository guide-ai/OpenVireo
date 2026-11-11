import {describe,expect,it} from 'vitest';
import {fixFrenchTypography as fix,fixSourceLiterals,frenchTypography,frenchTypographyFindings,NNBSP as N} from './frenchSpacing';
// Front FR0 (plan front-i18n-fr.md §4): the French typography fixer is pure and idempotent, rewrites only what §4.1 names and
// keeps every §4.2 exception; the source rewriter touches string literals only and writes characters, never escapes.
describe('Front FR0: the French typography fixer',()=>{
 const CASES:readonly (readonly [string,string])[]=[
  ['Prêt ?',`Prêt${N}?`],['Prêt?',`Prêt${N}?`],['Prêt\u00a0?',`Prêt${N}?`],['Longitude: 12',`Longitude${N}: 12`],['Attention ; rechargez !',`Attention${N}; rechargez${N}!`],
  ['Choisissez « Ouvrir ».',`Choisissez «${N}Ouvrir${N}».`],['Choisissez «Ouvrir».',`Choisissez «${N}Ouvrir${N}».`],
  ['Choisissez "Ouvrir".',`Choisissez «${N}Ouvrir${N}».`],['Choisissez “Ouvrir”.',`Choisissez «${N}Ouvrir${N}».`],
  ['« Il dit “oui” »',`«${N}Il dit “oui”${N}»`],// inner “ ” stay inside « »
  ['l\'objet d\'une étoile, aujourd\'hui',`l’objet d’une étoile, aujourd’hui`],
  ['Jusqu’à 1,000 mesures et 2 400 000 jours, 50\u00a0000 échantillons',`Jusqu’à 1${N}000 mesures et 2${N}400${N}000 jours, 50${N}000 échantillons`],
  ['« Fichier » : {name}',`«${N}Fichier${N}»${N}: {name}`],['{label}: {value}',`{label}${N}: {value}`],
  ['Vraiment ?!',`Vraiment${N}?!`],
 ];
 it.each(CASES)('fixes %j',(input,expected)=>{expect(fix(input)).toBe(expected);expect(fix(expected)).toBe(expected);});
 const KEPT=['?lang=fr','https://openvireo.space/?lang=fr','12:30:45','+26 07 59','12 30 45.6','rapport 1:2','lecteur C:\\','version 1.64.1','1.5','(RA:)','(Observer\'s Notebook)','(Save As...)',
  'Fichiers {count}','«A1» et «A2»','la touche ? n’importe où','(?)','?','10 novembre 2026','12%','1950 2000',`Prêt${N}?`];
 it.each(KEPT)('keeps %j',text=>{expect(fix(text)).toBe(text);});
 it('fixes French inside brackets but not a VIREO English gloss',()=>{
  expect(fix('(par exemple : 1.5)')).toBe(`(par exemple${N}: 1.5)`);expect(fix('(Voir l\'aide)')).toBe('(Voir l’aide)');
  expect(fix('Ascension droite (RA:) : 12')).toBe(`Ascension droite (RA:)${N}: 12`);
 });
 it('leaves an odd number of straight quotes and a fragment\'s quotes alone',()=>{
  expect(fix('Texte "ouvert')).toBe('Texte "ouvert');expect(fix('a "b" c',{quotes:false})).toBe('a "b" c');
 });
 it('reports each change, and the lint view leaves thousands to their own rules',()=>{
  expect(frenchTypography('Prêt ? l\'objet').changes.map(c=>c.label)).toEqual(['typographic apostrophe ’','narrow no-break space before ; : ! ?']);
  expect(frenchTypographyFindings('1,000 mesures')).toEqual([]);expect(frenchTypographyFindings(`Prêt${N}?`)).toEqual([]);
 });
 it('treats a template value as a word',()=>{
  expect(fix('l\'\ue000 :',{valueMarks:/\ue000/u})).toBe(`l’\ue000${N}:`);
 });
});
describe('Front FR0: rewriting the string literals of a map source',()=>{
 const f=(s:string)=>fixSourceLiterals(s,(t,o)=>fix(t,o));
 it('fixes single-quoted, double-quoted and template literals, writing the characters literally',()=>{
  const out=f("const A=Object.freeze({title:'Prêt ?',quote:\"l'objet\",count:(n:number)=>`Étoiles : ${n}`});");
  expect(out).toBe(`const A=Object.freeze({title:'Prêt${N}?',quote:"l’objet",count:(n:number)=>\`Étoiles${N}: \${n}\`});`);
  expect(out).not.toMatch(/\\u/);
 });
 it('decodes and re-encodes escapes, and keeps comments, keys, paths and regular expressions',()=>{
  expect(f("x:'l\\'objet',y:'a\\'b c'")).toBe("x:'l’objet',y:'a’b c'");
  const kept="import type {X} from '../../maps';// l'objet : rien\n/* d'accord ? */const m={'OBSRVHLP.LST':'Aide',r:/a'b ?/g};";
  expect(f(kept)).toBe(kept);
  expect(f("const s=`a ${cond?'Prêt ?':'non'} b`;")).toBe(`const s=\`a \${cond?'Prêt${N}?':'non'} b\`;`);// the code inside ${…} is rewritten too
  expect(f("const p=`${plural('fr',n,{one:`${n} fichier ?`,other:'l\\'objet'})} fin`;")).toBe(`const p=\`\${plural('fr',n,{one:\`\${n} fichier${N}?\`,other:'l’objet'})} fin\`;`);
 });
 it('is idempotent',()=>{
  const src="const T={a:'« Oui » : l\\'étape 1 000 ?',b:(x:string)=>`Fichier « ${x} » !`};";
  const once=f(src);expect(f(once)).toBe(once);
  expect(once).toBe(`const T={a:'«${N}Oui${N}»${N}: l’étape 1${N}000${N}?',b:(x:string)=>\`Fichier «${N}\${x}${N}»${N}!\`};`);
 });
});
