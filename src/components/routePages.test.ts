import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {ROUTE_GROUPS,ROUTE_PAGES,routesIn,type Route} from './routePages';

// Front HEADER: the page bar and the sidebar read one route table; every page belongs to exactly one section, in menu order.
describe('route table',()=>{
 const all=Object.keys(ROUTE_PAGES) as Route[];
 it('maps the 17 pages once each, every one but the welcome to a section that holds it',()=>{
  expect(all).toHaveLength(17);
  const grouped=ROUTE_GROUPS.flatMap(g=>routesIn(g));
  // Front HOME: the welcome (`home`) belongs to no section; the brand link opens it.
  expect(ROUTE_PAGES.home.group).toBeNull();
  expect([...grouped].sort()).toEqual(all.filter(r=>r!=='home').sort());
  expect(new Set(grouped).size).toBe(grouped.length);
  for(const r of all){const g=ROUTE_PAGES[r].group;if(g)expect(routesIn(g)).toContain(r);}
 });
 it('keeps the sections and their pages in the menu order the sidebar had',()=>{
  expect(ROUTE_GROUPS).toEqual(['optical','radio','analysis','files']);
  expect(routesIn('optical')).toEqual(['observatory','spectrometer','sky-exposure','star-exposure','galaxy-exposure','photometer']);
  expect(routesIn('radio')).toEqual(['radio-control','pulsar-analysis']);
  expect(routesIn('analysis')).toEqual(['spectrum','classification','cluster-database','lss-survey','lss-wedge','object-x','variable-stars']);
  expect(routesIn('files')).toEqual(['images']);
 });
 it('names each page with its sidebar label (a non-empty string read at call time)',()=>{
  for(const r of all){const label=ROUTE_PAGES[r].label();expect(typeof label).toBe('string');expect(label.trim().length,r).toBeGreaterThan(0);}
 });
 it('covers every page the address can name (the #route parser in OpenVireo.tsx)',()=>{
  const source=readFileSync(new URL('../OpenVireo.tsx',import.meta.url),'utf8');
  const parser=/const route=\(\)=>(.*)\n/.exec(source)![1];
  const named=[...parser.matchAll(/'([a-z-]+)' as const/g)].map(m=>m[1]);
  expect([...new Set(named)].sort()).toEqual([...all].sort());
 });
});
