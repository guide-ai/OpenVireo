/** Front SKY-LABELS [W]: where the web overlays put a label next to a mark, so it stays inside its SVG view. Pure geometry; the
 * caller supplies each label's width (the sky map measures its rendered text, so the result follows the font in use).
 *
 * - The observatory sky map's catalogue rings and labels are a web overlay (docs/SKY-FIELD-VIEW.md, "Web adaptations"):
 *   VIREO's render 0x53a40c paints only the field, so there is no native label placement to follow. A label sits right of
 *   its ring; one that would leave the view on the right is drawn left of the ring instead, as the Multi-Spec numbers flip
 *   sideways (0x53d6f0). Before Front SKY-LABELS such a label was placed past the view, where the sky-clip hid it.
 * - The Multi-Spec selection number: VIREO draws it left of its 15×15 box, right when it would leave the display on the left
 *   (0x53d6f0, analysis/front-plans/front-m-multispec.md). Its vertical placement is not recovered; the web keeps the baseline
 *   4 units below the selection and clamps it inside the display, so a selection at the top or bottom edge keeps its whole
 *   number. */

/** Gap between a sky-map ring's centre and its label (the ring's radius is 9). */
export const SKY_LABEL_GAP=13;
/** Rings closer than this on both axes are one mark: a catalogue row and its supported-galaxy target are drawn about
 * 0.7–0.8 units apart (their catalogue positions differ slightly). */
export const SKY_SAME_RING=3;

/** The start x of a sky-map label whose ring is at `x`, in a view `view` units wide, for a label (or a group of labels on the
 * same ring) `width` units wide: right of the ring (x+13) when it fits; otherwise left of it, ending at x−13, if there is more
 * room on the left. A label that fits is never moved. The label stays start-anchored on both sides, so labels that share a
 * ring (a catalogue row and its supported-galaxy target) still begin at the same x and read as one. A width of 0 (not
 * measured) keeps the label on the right. */
export function skyLabelX(x:number,width:number,view:number):number{
 const right=x+SKY_LABEL_GAP;
 return width<=0||right+width<=view||view-right>=x-SKY_LABEL_GAP?right:x-SKY_LABEL_GAP-width;
}

/** skyLabelX for every ring of the sky map, with the rings that mark the same place (within SKY_SAME_RING, transitively)
 * placed as one group by its widest label, so a group is never split across the ring and its labels keep a common start. */
export function skyLabelXs(rings:readonly Readonly<{x:number;y:number;width:number}>[],view:number):number[]{
 const group=rings.map((_,i)=>i),root=(i:number):number=>group[i]===i?i:(group[i]=root(group[i]));
 for(let i=0;i<rings.length;i++)for(let j=0;j<i;j++)
  if(Math.abs(rings[i].x-rings[j].x)<=SKY_SAME_RING&&Math.abs(rings[i].y-rings[j].y)<=SKY_SAME_RING)group[root(i)]=root(j);
 const widest=new Map<number,number>();
 rings.forEach((r,i)=>widest.set(root(i),Math.max(widest.get(root(i))??0,r.width)));
 return rings.map((r,i)=>skyLabelX(r.x,widest.get(root(i))!,view));
}

/** The Multi-Spec selection number's baseline for a selection at `y` in a `size`-unit display with a `fontSize` font: y+4,
 * kept between fontSize (room for the digits' ascent) and size−3 (room for the font's descent). */
export function multiSpecNumberBaseline(y:number,size:number,fontSize:number):number{
 return Math.min(size-3,Math.max(fontSize,y+4));
}
