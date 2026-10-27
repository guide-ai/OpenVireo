import{it,expect}from'vitest';
import{combinedTrace,sampledIntensityTrace,COMBINED_TRACE_POLICY,SAMPLED_TRACE_POLICY,CombinedTraceError}from'./combinedTrace';
// SYNTHETIC validation vector (not an acquired or original spectrum): 500 columns with chosen normalized values
// q=F/peak so the recovered 0x508796/0x508c87 branch (Single1.0 − q, ×Single100, round, baseline−height) is checked exactly.
function synthetic(){const peak=8,values=new Map([[0,8],[1,3],[2,5],[3,-2]]);return Object.freeze({peak,columns:Object.freeze(Array.from({length:500},(_,index)=>Object.freeze({index,wavelength:3900+index*1.2,intensity:values.get(index)??4})))});}
it('reverse=false keeps the existing normal trace output exactly',()=>{
 const s=synthetic(),before=JSON.stringify(s);
 for(const f of[combinedTrace,sampledIntensityTrace]){const normal=f(s),explicit=f(s,false);expect(explicit).toEqual(normal);expect(JSON.stringify(explicit)).toBe(JSON.stringify(normal));expect(normal).not.toHaveProperty('reverse');expect(normal.columns.slice(0,4).map(p=>[p.height,p.y])).toEqual([[100,25],[38,87],[62,63],[-25,150]]);}
 expect(JSON.stringify(s)).toBe(before);
});
it('reversed heights use 1−q before ×100 and nearest-even rounding, subtracted from the 125 baseline',()=>{
 const r=combinedTrace(synthetic(),true);
 // q=1 (peak column) → height 0 → y on the pane baseline; q=.375 → 62.5 → 62; q=.625 → 37.5 → 38; overshoot q=−.25 → 125 → y 0.
 expect(r.columns.slice(0,4).map(p=>[p.height,p.y])).toEqual([[0,125],[62,63],[38,87],[125,0]]);
 expect(r.columns[100]).toMatchObject({height:50,y:75});
 expect(r.policy).toBe(COMBINED_TRACE_POLICY);expect(sampledIntensityTrace(synthetic(),true).policy).toBe(SAMPLED_TRACE_POLICY);
});
it('keeps the same visible peak and source columns; only the display ordinate changes',()=>{
 const s=synthetic(),normal=combinedTrace(s),reversed=combinedTrace(s,true);
 expect(reversed.peak).toBe(normal.peak);expect(reversed.columns.length).toBe(500);
 reversed.columns.forEach((p,i)=>{expect([p.index,p.wavelength,p.intensity]).toEqual([s.columns[i].index,s.columns[i].wavelength,s.columns[i].intensity]);expect(p.y).toBe(125-p.height);});
 expect(Object.isFrozen(reversed)&&Object.isFrozen(reversed.columns)).toBe(true);
});
it('rejects a non-boolean reverse flag instead of coercing it',()=>{
 for(const bad of['true',1,null,{}])expect(()=>combinedTrace(synthetic(),bad as unknown as boolean)).toThrow(CombinedTraceError);
 expect(()=>sampledIntensityTrace(synthetic(),'yes' as unknown as boolean)).toThrow(CombinedTraceError);
});
