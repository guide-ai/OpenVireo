/** Where the tour card goes beside a highlighted part of the page (Front Onboarding [W]). Pure; all values in CSS pixels. */
export type Box=Readonly<{left:number;top:number;width:number;height:number}>;
export type Placement=Readonly<{left:number;top:number;side:'right'|'left'|'below'|'above'|'center'|'bottom'|'top'}>;

const GAP=14,MARGIN=12;
const clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));

/** `target` null (no part to show) centres the card; on narrow screens (< 600 px) the card docks at the bottom, or at the top
 * when the target's centre is in the lower half of the screen, so it never covers the target (review 1 S2). Otherwise it
 * goes beside the target on its inline-end side when that fits (the sidebar), else below, else above, else at the bottom.
 * Front RT6: `direction` is the page's (uiDirection()). Left to right, the inline end is the right and the card aligns with the
 * target's left edge below or above it, exactly as before; right to left, the sidebar is on the right, the card goes left of
 * the target (side 'left'), aligns with its right edge, and docks at the right on phones. */
export function placeTourCard(target:Box|null,card:{width:number;height:number},view:{width:number;height:number},direction:'ltr'|'rtl'='ltr'):Placement{
 const maxLeft=Math.max(MARGIN,view.width-card.width-MARGIN),maxTop=Math.max(MARGIN,view.height-card.height-MARGIN),rtl=direction==='rtl';
 if(!target)return {left:clamp((view.width-card.width)/2,MARGIN,maxLeft),top:clamp((view.height-card.height)/2,MARGIN,maxTop),side:'center'};
 if(view.width<600){const left=rtl?maxLeft:MARGIN;return target.top+target.height/2>view.height/2?{left,top:MARGIN,side:'top'}:{left,top:maxTop,side:'bottom'};}
 if(rtl){
  const left=target.left-GAP-card.width;
  if(left>=MARGIN)return {left,top:clamp(target.top,MARGIN,maxTop),side:'left'};
 }else{
  const right=target.left+target.width+GAP;
  if(right+card.width+MARGIN<=view.width)return {left:right,top:clamp(target.top,MARGIN,maxTop),side:'right'};
 }
 const left=clamp(rtl?target.left+target.width-card.width:target.left,MARGIN,maxLeft),below=target.top+target.height+GAP;
 if(below+card.height+MARGIN<=view.height)return {left,top:below,side:'below'};
 const above=target.top-GAP-card.height;
 if(above>=MARGIN)return {left,top:above,side:'above'};
 return {left:clamp((view.width-card.width)/2,MARGIN,maxLeft),top:maxTop,side:'bottom'};
}

/** Space between a highlighted part and its outline, and the outline's width. Keep in step with site-tour.css: the 3 px ring of
 * .site-tour-spot, and the 24 px scroll margin of .site-tour-scrolling (more than both together, so the whole outline is on
 * screen after scrolling). */
export const SPOT_PAD=12,SPOT_RING=3;

/** The outline around a highlighted part: SPOT_PAD of space all round, so the part's own text never touches the ring, pulled in
 * at the window's edges so the ring stays visible there (a sidebar at the edge, a part cut off by the window). */
export function spotBox(target:Box,view:{width:number;height:number}):Box{
 const left=Math.max(target.left-SPOT_PAD,SPOT_RING),top=Math.max(target.top-SPOT_PAD,SPOT_RING);
 const right=Math.min(target.left+target.width+SPOT_PAD,view.width-SPOT_RING),bottom=Math.min(target.top+target.height+SPOT_PAD,view.height-SPOT_RING);
 return {left,top,width:Math.max(0,right-left),height:Math.max(0,bottom-top)};
}
