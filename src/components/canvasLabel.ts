/** Front SC11 (scripts plan §2.1): canvas text names its own font, so the page's :lang() fallbacks never reach it. Under a
 * language with a script stack (ja, zh, hi: `--ov-font-script` of src/theme/scripts.css, inherited by the canvas) that stack
 * comes first, so kanji, hanzi and Devanagari get the regional system face, and the label's background grows to the text's
 * ink (Devanagari reaches above and below the 16 px band). Without one (English, Spanish, Portuguese, Russian: Cyrillic is in
 * every sans-serif) the font and the 16 px band are exactly the ones before. The background is as wide as the text drawn
 * (it measured the untranslated text before). Sets the font and the top baseline; returns the background rectangle. */
export function canvasLabel(ctx:CanvasRenderingContext2D,text:string,x:number,y:number):Readonly<{x:number;y:number;width:number;height:number}>{
 const script=getComputedStyle(ctx.canvas).getPropertyValue('--ov-font-script').trim();
 ctx.font=script?`bold 13px ${script},sans-serif`:'bold 13px sans-serif';ctx.textBaseline='top';
 const m=ctx.measureText(text),width=Math.ceil(m.width);
 if(!script)return {x,y,width,height:16};
 const top=Math.min(0,-Math.ceil(m.actualBoundingBoxAscent)),bottom=Math.max(16,Math.ceil(m.actualBoundingBoxDescent));
 return {x,y:y+top,width,height:bottom-top};
}
