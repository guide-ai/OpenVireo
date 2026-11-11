/** Where a form's popup menu goes (PopupMenu.tsx). Pure; CSS pixels, viewport coordinates.
 * Front SC3: the first placement assumes a 224 px menu; the rendered box is then measured and moved back inside the viewport
 * (4 px from the edge) only when it leaves it, so a menu that fits keeps its first placement.
 * Front RT6: in a right-to-left page the menu opens from the pointer toward the inline end: its right edge at the pointer, the
 * menu to its left (a keyboard-opened menu from the list's top-right corner). Left to right, every value is the one before. */
export type Direction='ltr'|'rtl';
/** The assumed width of the first placement (the menu is 12–18 rem wide). */
export const FIRST_WIDTH=224;
/** The point a keyboard-opened menu (no pointer position) opens from: the list's top-left corner, top-right right to left. */
export const keyboardAnchor=(list:Readonly<{left:number;right:number;top:number}>,direction:Direction)=>
 ({x:direction==='rtl'?list.right-8:list.left+8,y:list.top+8});
/** The left edge of the first placement, before the menu is measured. */
export const firstLeft=(x:number,viewWidth:number,direction:Direction)=>
 direction==='rtl'?Math.max(4,x-FIRST_WIDTH):Math.max(4,Math.min(x,viewWidth-FIRST_WIDTH));
/** The shift that brings [lo,hi] back inside [0,size] with 4 px to spare, or 0 when it is inside already. */
export const fit=(lo:number,hi:number,size:number)=>lo<0||hi>size?Math.max(Math.min(0,size-4-hi),4-lo):0;
/** The horizontal shift from the first placement, given the measured box at it ([left,right]). Left to right it is fit()'s;
 * right to left the box first moves so that its right edge is at the pointer (its left edge at least 4 px from the viewport's). */
export function shiftX(left:number,right:number,x:number,viewWidth:number,direction:Direction):number{
 if(direction!=='rtl')return fit(left,right,viewWidth);
 const width=right-left,toPointer=Math.max(4,x-width)-left;
 return toPointer+fit(left+toPointer,right+toPointer,viewWidth);
}
