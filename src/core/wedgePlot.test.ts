import{describe,expect,it}from'vitest';
import{wedgeParseRow,type WedgeRecord}from'./wedgeLssText';
import{WEDGE_NATIVE_TEXT}from'./wedgeNativeText';
import{WEDGE_COLOUR_SCHEMES,WEDGE_DEFAULT_OPTIONS,validWedgeOptions,wedgeArcSvgEnd,wedgeArcSvgPath,wedgeFrame,wedgePlot,wedgePoint}from'./wedgePlot';
// Expected pixels below were derived by hand from the recovered formulas
// (origin 445,510; radius 480; x=445−Round(r·sinθ), y=510−Round(r·cosθ)) with
// four-place sines; they are analytic controls, not an original runtime oracle.
const DEG='°';
const rec=(ra:string,value:string,hasZ=false):WedgeRecord=>{const r=wedgeParseRow('SYNTH'.padEnd(11)+'1 '+ra+' 0'+DEG+"0'0\" "+value+' t',2,hasZ,'.');if(r==='overflow')throw new Error();return{...r,source:0};};
describe('wedge frame 0x581610',()=>{
 it('draws the velocity grid with 15° RA spokes, three rings and native labels',()=>{
  const f=wedgeFrame(0);
  expect(f.lines.map(l=>[l.x2,l.y2])).toEqual([[445,30],[321,46],[205,94],[106,171],[29,270]]);
  expect(f.lines.every(l=>l.x1===445&&l.y1===510)).toBe(true);
  expect(f.texts.filter(t=>t.role==='ra-label').map(t=>[t.x,t.y,t.text])).toEqual([[438,5,'12'],[309,22,'13'],[188,72,'14'],[85,152,'15'],[5,255,'16']]);
  expect(f.arcs.map(a=>[a.r,a.endX,a.endY,a.startX,a.startY])).toEqual([[160,306,430,445,350],[320,168,350,445,190],[480,29,270,445,30]]);
  expect(f.texts.filter(t=>t.role!=='ra-label').map(t=>[t.x,t.y,t.text])).toEqual([[150,50,'RA (Hours)'],[460,344,'4000'],[460,184,'8000'],[460,24,'12000'],[465,5,'V(km/sec)']]);
 });
 it('draws the Z grid with 0.01-step rings and the no-grid boundary only',()=>{
  const z=wedgeFrame(1);
  expect(z.arcs.map(a=>[a.r,a.endX,a.endY])).toEqual([[120,341,450],[240,237,390],[360,133,330],[480,29,270]]);
  expect(z.texts.filter(t=>t.role==='ring-label'||t.role==='axis-title').map(t=>[t.x,t.y,t.text])).toEqual([[465,384,'0.01'],[465,264,'0.02'],[465,144,'0.03'],[465,24,'0.04'],[465,5,'Z(=V/C)']]);
  const none=wedgeFrame(2);
  expect(none.lines.map(l=>[l.x2,l.y2])).toEqual([[445,30],[29,270]]);
  expect(none.texts.map(t=>t.text)).toEqual(['12','16','RA (Hours)']);
  expect(none.arcs).toEqual([{cx:445,cy:510,r:480,startX:445,startY:30,endX:29,endY:270}]);
 });
});
describe('SVG approximation of the GDI Arc end (pure core, not native pixels)',()=>{
 // Independent control: normalise the GDI direction vector (no atan2/cos/sin) and scale to r.
 const normalised=(a:{cx:number;cy:number;r:number;endX:number;endY:number})=>{const vx=a.endX-a.cx,vy=a.endY-a.cy,len=Math.sqrt(vx*vx+vy*vy);return{x:a.cx+a.r*vx/len,y:a.cy+a.r*vy/len};};
 // Golden paths: the d attributes WedgePlotSvg drew before the move, hand-checked to 3 decimals
 // (e.g. r=480 through (29,270): |(−416,−240)|=480.26659…, end (29.230919, 270.133222)).
 const golden:Record<0|1|2,string[]>={
  0:['M 445 350 A 160 160 0 0 0 306.327 430.188','M 445 190 A 320 320 0 0 0 167.904 349.945','M 445 30 A 480 480 0 0 0 29.231 270.133'],
  1:['M 445 390 A 120 120 0 0 0 341.058 450.033','M 445 270 A 240 240 0 0 0 237.115 390.067','M 445 150 A 360 360 0 0 0 133.173 330.100','M 445 30 A 480 480 0 0 0 29.231 270.133'],
  2:['M 445 30 A 480 480 0 0 0 29.231 270.133'],
 };
 it('keeps the GDI direction points and draws the same paths as before',()=>{
  for(const grid of[0,1,2]as const){
   const arcs=wedgeFrame(grid).arcs;
   expect(arcs.map(wedgeArcSvgPath)).toEqual(golden[grid]);
   for(const a of arcs){
    // GDI fields are the recovered integers, not the projected end.
    expect([a.cx,a.cy,a.startX,a.startY]).toEqual([445,510,445,510-a.r]);expect(Number.isInteger(a.endX)&&Number.isInteger(a.endY)).toBe(true);
    const e=wedgeArcSvgEnd(a),n=normalised(a);
    expect(Math.abs(e.x-n.x)).toBeLessThan(1e-9);expect(Math.abs(e.y-n.y)).toBeLessThan(1e-9);
    // On the circle, on the ray from the centre through the direction point, in front of the centre.
    expect(Math.abs(Math.hypot(e.x-a.cx,e.y-a.cy)-a.r)).toBeLessThan(1e-9);
    const vx=a.endX-a.cx,vy=a.endY-a.cy;
    expect(Math.abs((e.x-a.cx)*vy-(e.y-a.cy)*vx)).toBeLessThan(1e-7);expect((e.x-a.cx)*vx+(e.y-a.cy)*vy).toBeGreaterThan(0);
    // The direction point is near the 60° radial: the SVG end is within 1 px of r·(−sin60°, −cos60°).
    expect(Math.hypot(e.x-(a.cx-a.r*Math.sqrt(3)/2),e.y-(a.cy-a.r/2))).toBeLessThan(1);
   }
  }
 });
 it('refuses a direction point at the centre (no defined GDI direction)',()=>{
  expect(()=>wedgeArcSvgEnd({cx:445,cy:510,r:10,startX:445,startY:500,endX:445,endY:510})).toThrow(RangeError);
 });
});
describe('wedge colours',()=>{
 it('maps the coordinator-extracted TColor dwords (decimal) to RGB in .data order',()=>{
  // Dwords as published in COORDINATOR-colors-and-results.json: 8388608,65535,16777215,65280 / 16777215,0,0,8421504.
  expect(WEDGE_COLOUR_SCHEMES.map(s=>[s.dwords.background,s.dwords.ink,s.dwords.own,s.dwords.group])).toEqual([[8388608,65535,16777215,65280],[16777215,0,0,8421504]]);
  expect(WEDGE_COLOUR_SCHEMES.map(s=>[s.background,s.ink,s.own,s.group])).toEqual([['#000080','#ffff00','#ffffff','#00ff00'],['#ffffff','#000000','#000000','#808080']]);
 });
});
describe('wedge points 0x581bc8',()=>{
 it('projects RA hours and Single z with θ=(RA−12)·15° and r=12000·z',()=>{
  expect(wedgePoint(rec('13h30m0s','6000'),0,1)).toMatchObject({status:'plotted',cx:353,cy:288,thetaDegrees:22.5,boundary:false});
  expect(wedgePoint(rec('12h0m0s','0.04',true),0,1)).toMatchObject({status:'plotted',cx:445,cy:30});
  expect(wedgePoint(rec('16h0m0s','0.02',true),0,1)).toMatchObject({status:'plotted',cx:237,cy:390});
  // East of 12h plots to the right of the vertical spoke; the original does not clip RA.
  expect(wedgePoint(rec('11h0m0s','0.02',true),0,1)).toMatchObject({status:'plotted',cx:507,cy:278});
 });
 it('flags rounding ties and points wholly outside the 550 px client, and excludes unparsed rows',()=>{
  const tie=wedgePoint(rec('12h0m0s','0.0000416666666667',true),0,1);
  expect(tie.boundary).toBe(true);expect(tie.radiusPx).toBeCloseTo(0.5,6);
  expect(wedgePoint(rec('12h0m0s','0.1',true),0,1)).toMatchObject({status:'outside-client',cy:-690});
  expect(wedgePoint(rec('12h0m0s','0.04291',true),0,5).status).toBe('plotted');
  expect(wedgePoint(rec('12:00','0.02',true),0,1)).toMatchObject({status:'excluded-ra',cx:null});
  expect(wedgePoint(rec('12h0m0s','',true),0,1)).toMatchObject({status:'excluded-redshift'});
 });
 it('counts admitted records for the native "Points Plotted" text and validates options',()=>{
  const p=wedgePlot([rec('13h30m0s','6000'),rec('12h0m0s','0.1',true),rec('bad','1')],WEDGE_DEFAULT_OPTIONS);
  expect([p.admitted,p.drawn,p.excluded,p.countText]).toEqual([2,1,1,'Points Plotted: 2']);
  // The drawn text uses the provenance literal 0x582158 (one source of truth).
  expect(p.countText).toBe(WEDGE_NATIVE_TEXT.pointsPlotted+'2');
  expect(validWedgeOptions({grid:1,pointSize:5,pointStyle:1})).toBe(true);
  for(const bad of[{grid:3,pointSize:1,pointStyle:0},{grid:0,pointSize:6,pointStyle:0},{grid:0,pointSize:1.5,pointStyle:0},{grid:0,pointSize:1,pointStyle:2},null])expect(validWedgeOptions(bad)).toBe(false);
  expect(()=>wedgePlot([],{grid:0,pointSize:0,pointStyle:0}as never)).toThrow(RangeError);
 });
});
