import {describe,expect,it} from 'vitest';
import {PROJECT_REPO_URL,newIssueUrl,routeName} from './projectLinks';

describe('Front Project Links: GitHub links',()=>{
 it('points at the public repository',()=>{
  expect(PROJECT_REPO_URL).toBe('https://github.com/guide-ai/OpenVireo');
 });
 it('opens a new issue whose text names only the current page',()=>{
  const url=new URL(newIssueUrl('radio-control'));
  expect(url.origin+url.pathname).toBe('https://github.com/guide-ai/OpenVireo/issues/new');
  expect([...url.searchParams.keys()]).toEqual(['body']);
  const body=url.searchParams.get('body')!;
  expect(body).toContain('#radio-control');
  expect(body).toMatch(/What happened\?[\s\S]*What did you expect\?[\s\S]*Steps to reproduce/);
 });
 it('encodes a page name so it cannot add parameters',()=>{
  const url=new URL(newIssueUrl('x&title=spam#y'));
  expect([...url.searchParams.keys()]).toEqual(['body']);
  expect(url.hash).toBe('');
  expect(url.searchParams.get('body')).toContain('#x&title=spam#y');
 });
 it('accepts only plain route names for the page (review 1)',()=>{
  expect(routeName('radio-control')).toBe('radio-control');
  for(const bad of [undefined,null,'','Line1\n**Steps**','x&y','#spectrum','Spectrum','a'.repeat(41),'-x','x--y'])expect(routeName(bad),String(bad)).toBe('observatory');
 });
});
