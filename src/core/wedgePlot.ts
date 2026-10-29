import{roundNearestEven}from'./numericPolicy';
import type{WedgeRecord}from'./wedgeLssText';
import{WEDGE_NATIVE_TEXT}from'./wedgeNativeText';
/** TWedgePlot paint contract (VMT 0x580af8): FormPaint 0x580ed4 → grid 0x581610,
 * points 0x581bc8. FormCreate 0x580dc0 sets a 550×550 client. Angles use FSIN
 * 0x4036bc/FCOS 0x4036ac on Extended; this port uses Number Math.sin/Math.cos and
 * 0x403700 FISTP rounding as nearest-even. Results within WEDGE_ROUND_GUARD of a
 * .5 tie are flagged, not claimed. GDI font metrics are not recovered. */

/** TColor dwords (0x00BBGGRR) at .data 0x5b4acc..0x5b4ae8, selected by TWedgePlot+0x394:
 * 0 = brush/pen+font/own/group of the colour display, 1 = the black-and-white scheme.
 * Print1Click 0x580f88 sets +0x394 := Env+0x2e8d XOR 1 (0x580fba–0x580fc3) while printing
 * (the web print always uses 1). FormShow copies +0x394 from Env+0x2e8e, whose
 * default is not recovered; WdgPltHlp.TXT says the display is normally colour. */
export type WedgeColourScheme=0|1;
export type WedgeColours=Readonly<{background:string;ink:string;own:string;group:string;dwords:Readonly<{background:number;ink:number;own:number;group:number}>}>;
const tcolor=(dword:number)=>'#'+[dword&0xff,(dword>>>8)&0xff,(dword>>>16)&0xff].map(v=>v.toString(16).padStart(2,'0')).join('');
const scheme=(background:number,ink:number,own:number,group:number):WedgeColours=>Object.freeze({background:tcolor(background),ink:tcolor(ink),own:tcolor(own),group:tcolor(group),dwords:Object.freeze({background,ink,own,group})});
export const WEDGE_COLOUR_SCHEMES:readonly WedgeColours[]=Object.freeze([scheme(0x00800000,0x0000ffff,0x00ffffff,0x0000ff00),scheme(0x00ffffff,0x00000000,0x00000000,0x00808080)]);
export const WEDGE_GEOMETRY=Object.freeze({client:550,originX:445,originY:510,radius:480,labelOffset:20,
 /** r = (100.0 × z) × 120.0 (constants 0x582148, 0x58214c). */
 zScale:100,pixelScale:120,
 /** θ = (RA − 12.0) × 15.0 × π/180 (constants 0x582134, 0x582138, 0x58213c). */
 raOrigin:12,degreesPerHour:15,
 countLabel:Object.freeze({x:50,y:460}),raTitle:Object.freeze({x:150,y:50,text:'RA (Hours)'})});
export const WEDGE_ROUND_GUARD=1e-6;
const G=WEDGE_GEOMETRY;

/** GridGrp items (DFM): 0 "Velocity", 1 "Red Shift (Z)", 2 "No Grid". */
export type WedgeGridType=0|1|2;
export type WedgePointSize=1|2|3|4|5;
/** PtStyleGrp items: 0 "Open" (bsClear), 1 "Filled" (solid brush). */
export type WedgePointStyle=0|1;
export type WedgeOptions=Readonly<{grid:WedgeGridType;pointSize:WedgePointSize;pointStyle:WedgePointStyle}>;
/** 0x5803e0 defaults: grid 0, point size 1, style 0 (auto plot off, 300 s interval: unadmitted). */
export const WEDGE_DEFAULT_OPTIONS:WedgeOptions=Object.freeze({grid:0,pointSize:1,pointStyle:0});
export function validWedgeOptions(o:unknown):o is WedgeOptions{
 if(!o||typeof o!=='object')return false;const v=o as Record<string,unknown>;
 return(v.grid===0||v.grid===1||v.grid===2)&&Number.isInteger(v.pointSize)&&(v.pointSize as number)>=1&&(v.pointSize as number)<=5&&(v.pointStyle===0||v.pointStyle===1);
}

const RAD=Math.PI/180;
const round=(x:number)=>roundNearestEven(x);
const tie=(x:number)=>Math.abs(Math.abs(x-Math.floor(x))-0.5)<WEDGE_ROUND_GUARD;

export type WedgeLine=Readonly<{x1:number;y1:number;x2:number;y2:number}>;
/** GDI Arc counter-clockwise from the top radial (445,510−r) to the radial through (endX,endY). */
export type WedgeArc=Readonly<{cx:number;cy:number;r:number;startX:number;startY:number;endX:number;endY:number}>;
export type WedgeText=Readonly<{x:number;y:number;text:string;role:'ra-label'|'ra-title'|'ring-label'|'axis-title'}>;
export type WedgeFrame=Readonly<{lines:readonly WedgeLine[];arcs:readonly WedgeArc[];texts:readonly WedgeText[]}>;

/** FloatToStrF(0.01×i, ffFixed, 18, 2) (0x486268). Host DecimalSeparator not recovered; '.' is used. */
const hundredths=(i:number)=>'0.'+String(i).padStart(2,'0');

export function wedgeFrame(grid:WedgeGridType):WedgeFrame{
 const lines:WedgeLine[]=[],arcs:WedgeArc[]=[],texts:WedgeText[]=[];
 const count=grid===2?1:4,step=grid===2?60:15;
 let dx=0,dy=0;
 for(let i=0;i<=count;i++){
  const degrees=i*step,theta=degrees*RAD,s=Math.sin(theta),c=Math.cos(theta);
  dx=round(s*G.radius);dy=round(c*G.radius);
  lines.push({x1:G.originX,y1:G.originY,x2:G.originX-dx,y2:G.originY-dy});
  texts.push({x:G.originX-dx-7-round(s*G.labelOffset),y:G.originY-dy-5-round(c*G.labelOffset),text:String(round(degrees/G.degreesPerHour)+G.raOrigin),role:'ra-label'});
 }
 texts.push({...G.raTitle,role:'ra-title'});
 const arc=(r:number,endDx:number,endDy:number)=>arcs.push({cx:G.originX,cy:G.originY,r,startX:G.originX,startY:G.originY-r,endX:G.originX-endDx,endY:G.originY-endDy});
 const s60=Math.sin(Math.PI/3),c60=Math.cos(Math.PI/3);
 if(grid===2)arc(G.radius,dx,dy);
 else if(grid===1){
  for(let i=1;i<=4;i++){const r=120*i;arc(r,round(r*s60),round(r*c60));texts.push({x:465,y:G.originY-r-6,text:hundredths(i),role:'ring-label'});}
  texts.push({x:465,y:G.originY-G.radius-25,text:'Z(=V/C)',role:'axis-title'});
 }else{
  for(let i=1;i<=3;i++){const r=160*i;arc(r,round(r*s60),round(r*c60));texts.push({x:460,y:G.originY-r-6,text:String(4000*i),role:'ring-label'});}
  texts.push({x:465,y:G.originY-G.radius-25,text:'V(km/sec)',role:'axis-title'});
 }
 return Object.freeze({lines:Object.freeze(lines),arcs:Object.freeze(arcs),texts:Object.freeze(texts)});
}

/** SVG approximation of GDI Arc (not native pixels). GDI ends the arc where the ray from
 * the centre through the direction point (endX,endY) meets the ellipse; an SVG elliptical
 * arc needs that point on the circle, so it is projected onto radius r here. The recovered
 * integer direction point stays in WedgeArc unchanged. */
export function wedgeArcSvgEnd(a:WedgeArc):Readonly<{x:number;y:number}>{
 if(a.endX===a.cx&&a.endY===a.cy)throw new RangeError('arc direction');
 const phi=Math.atan2(a.endY-a.cy,a.endX-a.cx);
 return Object.freeze({x:a.cx+a.r*Math.cos(phi),y:a.cy+a.r*Math.sin(phi)});
}
/** SVG path for one arc: counter-clockwise on screen (sweep-flag 0), minor arc (the
 * recovered arcs span 60°), end rounded to 3 decimals for the attribute. */
export function wedgeArcSvgPath(a:WedgeArc):string{
 const e=wedgeArcSvgEnd(a);
 return`M ${a.startX} ${a.startY} A ${a.r} ${a.r} 0 0 0 ${e.x.toFixed(3)} ${e.y.toFixed(3)}`;
}

export type WedgePlotStatus='plotted'|'outside-client'|'excluded-ra'|'excluded-redshift';
export type WedgePoint=Readonly<{index:number;status:WedgePlotStatus;thetaDegrees:number|null;radiusPx:number|null;dx:number|null;dy:number|null;cx:number|null;cy:number|null;boundary:boolean}>;
const PIXEL_LIMIT=1e9;
/** One record of list +0x44a through 0x581cbe..0x581d82. */
export function wedgePoint(record:WedgeRecord,index:number,size:WedgePointSize):WedgePoint{
 const none={thetaDegrees:null,radiusPx:null,dx:null,dy:null,cx:null,cy:null,boundary:false};
 if(record.ra.status!=='value')return Object.freeze({index,status:'excluded-ra',...none});
 if(record.redshift.status!=='value')return Object.freeze({index,status:'excluded-redshift',...none});
 const thetaDegrees=(record.ra.hours-G.raOrigin)*G.degreesPerHour,theta=thetaDegrees*RAD;
 const radiusPx=(G.zScale*record.redshift.z.value)*G.pixelScale;
 const xs=Math.sin(theta)*radiusPx,ys=Math.cos(theta)*radiusPx;
 if(!Number.isFinite(xs)||!Number.isFinite(ys)||Math.abs(xs)>PIXEL_LIMIT||Math.abs(ys)>PIXEL_LIMIT)return Object.freeze({index,status:'outside-client',...none,thetaDegrees,radiusPx});
 const dx=round(xs),dy=round(ys),cx=G.originX-dx,cy=G.originY-dy;
 const inside=cx+size>=0&&cx-size<=G.client&&cy+size>=0&&cy-size<=G.client;
 return Object.freeze({index,status:inside?'plotted':'outside-client',thetaDegrees,radiusPx,dx,dy,cx,cy,boundary:record.redshift.boundary||tie(xs)||tie(ys)});
}
export type WedgePlot=Readonly<{frame:WedgeFrame;points:readonly WedgePoint[];admitted:number;drawn:number;excluded:number;countText:string}>;
/** Native text: "Points Plotted: "+count (0x582158, at 50,460). The original counts every
 * list entry; the web counts admitted records and reports excluded ones separately. */
export function wedgePlot(records:readonly WedgeRecord[],options:WedgeOptions):WedgePlot{
 if(!validWedgeOptions(options))throw new RangeError('wedge options');
 const points=records.map((r,i)=>wedgePoint(r,i,options.pointSize));
 const admitted=points.filter(p=>p.status==='plotted'||p.status==='outside-client').length;
 return Object.freeze({frame:wedgeFrame(options.grid),points:Object.freeze(points),admitted,drawn:points.filter(p=>p.status==='plotted').length,excluded:points.length-admitted,countText:WEDGE_NATIVE_TEXT.pointsPlotted+admitted});
}
