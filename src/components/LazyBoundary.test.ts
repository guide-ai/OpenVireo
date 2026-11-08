import {describe,expect,it} from 'vitest';
import {isChunkLoadError,watchPreloadErrors} from './LazyBoundary';

describe('Front REL1 review 1 M1: chunk-load failures are told apart from other errors',()=>{
 it('recognises the Chromium, Firefox and WebKit messages of a failed dynamic import',()=>{
  for(const m of ['Failed to fetch dynamically imported module: https://x.pages.dev/assets/ObjectXLab-abc.js','error loading dynamically imported module: /assets/a.js','Importing a module script failed.','Unable to preload CSS for /assets/a.css'])
   expect(isChunkLoadError(new TypeError(m))).toBe(true);
 });
 it('leaves ordinary render errors generic until Vite reports a preload failure',()=>{
  expect(isChunkLoadError(new TypeError('Cannot read properties of undefined'))).toBe(false);
  expect(isChunkLoadError(new RangeError('Invalid array length'))).toBe(false);
  expect(isChunkLoadError(null)).toBe(false);
  const listeners:Record<string,()=>void>={};
  watchPreloadErrors({addEventListener:((type:string,f:()=>void)=>{listeners[type]=f;}) as Window['addEventListener']});
  listeners['vite:preloadError']();
  expect(isChunkLoadError(new TypeError('some other network wording'))).toBe(true);
  expect(isChunkLoadError(new RangeError('Invalid array length'))).toBe(false);// still not a load failure
 });
});
