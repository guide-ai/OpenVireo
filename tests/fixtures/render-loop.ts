import{expect,type Page,type TestType}from'@playwright/test';

/** Fails each test of the calling spec when React logs "Maximum update depth exceeded" (a state update scheduled in every
 * passive-effect flush, for example an effect keyed on a pointing that drifts with the observatory clock). */
export function guardRenderLoops(test:TestType<{page:Page},object>){
 const seen=new WeakMap<Page,string[]>();
 test.beforeEach(({page})=>{const log:string[]=[];seen.set(page,log);page.on('console',m=>{if(m.type()==='error'&&m.text().includes('Maximum update depth exceeded'))log.push(m.text());});});
 test.afterEach(({page})=>{expect(seen.get(page)??[],'React render loop').toEqual([]);});
}
