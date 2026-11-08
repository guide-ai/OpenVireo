/** Where the tour card goes beside a highlighted part of the page (Front Onboarding [W]). Pure; all values in CSS pixels. */
export type Box=Readonly<{left:number;top:number;width:number;height:number}>;
export type Placement=Readonly<{left:number;top:number;side:'right'|'below'|'above'|'center'|'bottom'}>;

const GAP=14,MARGIN=12;
const clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));

/** `target` null (no part to show) centres the card; on narrow screens (< 600 px) the card docks at the bottom. Otherwise it
 * goes right of the target when that fits (the sidebar), else below, else above, else at the bottom. */
export function placeTourCard(target:Box|null,card:{width:number;height:number},view:{width:number;height:number}):Placement{
 const maxLeft=Math.max(MARGIN,view.width-card.width-MARGIN),maxTop=Math.max(MARGIN,view.height-card.height-MARGIN);
 if(!target)return {left:clamp((view.width-card.width)/2,MARGIN,maxLeft),top:clamp((view.height-card.height)/2,MARGIN,maxTop),side:'center'};
 if(view.width<600)return {left:MARGIN,top:maxTop,side:'bottom'};
 const right=target.left+target.width+GAP;
 if(right+card.width+MARGIN<=view.width)return {left:right,top:clamp(target.top,MARGIN,maxTop),side:'right'};
 const left=clamp(target.left,MARGIN,maxLeft),below=target.top+target.height+GAP;
 if(below+card.height+MARGIN<=view.height)return {left,top:below,side:'below'};
 const above=target.top-GAP-card.height;
 if(above>=MARGIN)return {left,top:above,side:'above'};
 return {left:clamp((view.width-card.width)/2,MARGIN,maxLeft),top:maxTop,side:'bottom'};
}
