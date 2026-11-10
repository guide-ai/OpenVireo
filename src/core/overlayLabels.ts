/** Front SKY-LABELS [W]: where the web overlays put a label next to a mark, so it stays inside its SVG view. Pure geometry; the
 * caller supplies each label's measured box (the sky map measures its rendered text, so the result follows the font in use).
 *
 * - The observatory sky map's catalogue rings and labels are a web overlay (docs/SKY-FIELD-VIEW.md, "Web adaptations"):
 *   VIREO's render 0x53a40c draws no catalogue labels on the field (its only text is the slewing message), so there is no
 *   native label placement to follow. A label sits right of its ring; one that would leave the view on the right is drawn
 *   left of the ring instead, as the Multi-Spec numbers flip sideways (0x53d6f0). A label too wide for either side is kept
 *   inside the view, over its ring, and a label near the top or bottom edge is moved vertically just enough to stay inside.
 *   Before Front SKY-LABELS such a label was placed past the view, where the sky-clip hid it.
 * - The Multi-Spec selection number: VIREO draws it left of its 15×15 box, right when it would leave the display on the left
 *   (0x53d6f0, analysis/front-plans/front-m-multispec.md). Its vertical placement is not recovered; the web keeps the baseline
 *   4 units below the selection and clamps it inside the display, so a selection at the top or bottom edge keeps its whole
 *   number. */

/** Gap between a sky-map ring's centre and its label (the ring's radius is 9). */
export const SKY_LABEL_GAP=13;
/** The label's baseline below its ring's centre (y+4, unchanged from before Front SKY-LABELS). */
export const SKY_LABEL_DROP=4;
/** Rings closer than this on both axes are one mark: a catalogue row and its supported-galaxy target are drawn about
 * 0.7–0.8 units apart (their catalogue positions differ slightly). */
export const SKY_SAME_RING=3;

type Side='right'|'left';
/** Right of the ring when the label fits there, or when the right has at least as much room as the left; else left. A group of
 * rings is decided once, from its rightmost ring (fit on the right) and its leftmost (room on the left), so it is never split. */
const skySide=(minX:number,maxX:number,width:number,view:number):Side=>{
 const right=maxX+SKY_LABEL_GAP;
 return width<=0||right+width<=view||view-right>=minX-SKY_LABEL_GAP?'right':'left';
};
/** The start x on `side`, kept inside [0, view−width] (a label wider than the view starts at 0). A width of 0 (not measured or
 * not drawn) keeps the label right of its ring, unchanged. */
const skyPlace=(x:number,side:Side,width:number,view:number):number=>{
 if(width<=0)return x+SKY_LABEL_GAP;
 const start=side==='right'?x+SKY_LABEL_GAP:x-SKY_LABEL_GAP-width;
 return Math.max(0,Math.min(view-width,start));
};

/** The start x of a sky-map label whose ring is at `x`, in a view `view` units wide, for a label (or a group of labels on the
 * same ring) `width` units wide: right of the ring (x+13) when it fits; otherwise left of it, ending at x−13, if there is more
 * room on the left; either way kept inside the view. A label that fits is never moved. The label stays start-anchored on both
 * sides, so labels that share a ring (a catalogue row and its supported-galaxy target) still begin at the same x and read as
 * one. A width of 0 (not measured) keeps the label on the right. */
export function skyLabelX(x:number,width:number,view:number):number{
 return skyPlace(x,skySide(x,x,width,view),width,view);
}

/** skyLabelX for every ring of the sky map, with the rings that mark the same place (within SKY_SAME_RING on both axes,
 * transitively) placed as one group by its widest label, on one side, so a group is never split across the ring and its
 * labels keep a common start. A ring with width 0 (a masked object, which is not drawn, or a label not measured) joins no
 * group, so it can neither move a drawn label nor link two others. */
export function skyLabelXs(rings:readonly Readonly<{x:number;y:number;width:number}>[],view:number):number[]{
 const group=rings.map((_,i)=>i),root=(i:number):number=>group[i]===i?i:(group[i]=root(group[i]));
 for(let i=0;i<rings.length;i++)if(rings[i].width>0)for(let j=0;j<i;j++)
  if(rings[j].width>0&&Math.abs(rings[i].x-rings[j].x)<=SKY_SAME_RING&&Math.abs(rings[i].y-rings[j].y)<=SKY_SAME_RING)group[root(i)]=root(j);
 const box=new Map<number,{width:number;minX:number;maxX:number}>();
 rings.forEach((r,i)=>{const k=root(i),b=box.get(k);
  box.set(k,b?{width:Math.max(b.width,r.width),minX:Math.min(b.minX,r.x),maxX:Math.max(b.maxX,r.x)}:{width:r.width,minX:r.x,maxX:r.x});});
 return rings.map((r,i)=>{const b=box.get(root(i))!;return skyPlace(r.x,skySide(b.minX,b.maxX,b.width,view),b.width,view);});
}

/** The baseline of a sky-map label whose ring is at `y`, in a view `view` units tall: y+4, moved just enough that the label's
 * measured font box (`ascent` above the baseline, `descent` below) stays inside the view. Not measured (both 0): y+4. */
export function skyLabelBaseline(y:number,view:number,ascent:number,descent:number):number{
 const base=y+SKY_LABEL_DROP;
 return ascent<=0&&descent<=0?base:Math.max(ascent,Math.min(view-descent,base));
}

/** The Multi-Spec selection number's baseline for a selection at `y` in a `size`-unit display with a `fontSize` font: y+4,
 * kept between fontSize (room for the digits' ascent) and size−3 (room for the font's descent). */
export function multiSpecNumberBaseline(y:number,size:number,fontSize:number):number{
 return Math.min(size-3,Math.max(fontSize,y+4));
}
