import {inflateSync} from 'node:zlib';

/** Front NEWCOMER NC3 review (S1): the text Chromium's `page.pdf()` drew, enough to check that a passage was printed. It reads
 * Skia's PDF 1.4 output only: plain indirect objects (no object streams), Flate content streams, Type0 fonts with Identity-H
 * glyph ids and a ToUnicode CMap (bfchar and bfrange), and `Tf`, `Tj` and `TJ`. Layout (spaces, line breaks) is not
 * reconstructed: compare with `pdfHas`, which ignores white space. No dependency, no file written. */
export function pdfText(pdf:Buffer):string{
 const src=pdf.toString('latin1');
 const objects=new Map<number,{dict:string;stream:Buffer|null}>();
 const re=/(\d+) 0 obj\s*([\s\S]*?)endobj/g;
 for(let m=re.exec(src);m;m=re.exec(src)){
  const body=m[2]!,at=body.indexOf('stream');
  let stream:Buffer|null=null,dict=body;
  if(at>=0&&/^\s*<</.test(body)){
   dict=body.slice(0,at);
   const start=m.index+m[0].indexOf(body)+at+'stream'.length+(body[at+6]==='\r'?2:1);
   const length=Number(/\/Length (\d+)/.exec(dict)?.[1]??-1);
   const raw=length>=0?pdf.subarray(start,start+length):Buffer.from(body.slice(at+7,body.lastIndexOf('endstream')),'latin1');
   stream=/\/FlateDecode/.test(dict)?inflateSync(raw):raw;
  }
  objects.set(Number(m[1]),{dict,stream});
 }
 const ref=(text:string,key:string)=>{const r=new RegExp(`/${key}\\s+(\\d+) 0 R`).exec(text);return r?Number(r[1]):null;};
 const cmaps=new Map<number,Map<number,string>>();
 const cmapOf=(font:number)=>{
  let map=cmaps.get(font);if(map)return map;
  map=new Map();cmaps.set(font,map);
  const id=ref(objects.get(font)?.dict??'','ToUnicode'),text=id===null?'':objects.get(id)?.stream?.toString('latin1')??'';
  const hex=(h:string)=>String.fromCodePoint(...(h.match(/.{4}/g)??[]).map(x=>parseInt(x,16)));
  for(const block of text.matchAll(/beginbfchar([\s\S]*?)endbfchar/g))for(const [,g,u] of block[1]!.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g))map.set(parseInt(g!,16),hex(u!));
  for(const block of text.matchAll(/beginbfrange([\s\S]*?)endbfrange/g))for(const [,a,b,u] of block[1]!.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)){
   const first=parseInt(u!,16);for(let g=parseInt(a!,16);g<=parseInt(b!,16);g++)map.set(g,String.fromCodePoint(first+g-parseInt(a!,16)));
  }
  return map;
 };
 let out='';
 for(const {dict} of objects.values()){
  if(!/\/Type\s*\/Page\b/.test(dict))continue;
  const fonts=new Map<string,number>(),block=/\/Font\s*<<([\s\S]*?)>>/.exec(dict)?.[1]??'';
  for(const [,name,id] of block.matchAll(/\/(\S+?)\s+(\d+) 0 R/g))fonts.set(name!,Number(id));
  const contents=ref(dict,'Contents'),ops=contents===null?'':objects.get(contents)?.stream?.toString('latin1')??'';
  let map=new Map<number,string>();
  const show=(h:string)=>{for(const g of h.match(/.{4}/g)??[])out+=map.get(parseInt(g,16))??'';};
  for(const t of ops.matchAll(/\/(\S+)\s+[\d.]+\s+Tf|<([0-9A-Fa-f]*)>\s*Tj|\[((?:[^\]]|\\\])*)\]\s*TJ/g)){
   if(t[1]!==undefined){const id=fonts.get(t[1]);map=id===undefined?new Map():cmapOf(id);}
   else if(t[2]!==undefined)show(t[2]);
   else for(const [,h] of t[3]!.matchAll(/<([0-9A-Fa-f]*)>/g))show(h!);
   out+=' ';
  }
  out+='\n';
 }
 return out;
}
/** Whether `text` was printed, white space ignored. */
export const pdfHas=(pdf:string,text:string)=>pdf.replace(/\s+/g,'').includes(text.replace(/\s+/g,''));
