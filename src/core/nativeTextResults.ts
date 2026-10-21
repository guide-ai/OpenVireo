/** Native549e18/547fd0 text-reader slices and54708c header builder. This
 * bounded lexical reader preserves supplied claims;no native record/date/FPU
 * conversion,default numeric metadata or notebook authority is constructed. */
export const NATIVE_TEXT_MAX_BYTES=524288,NATIVE_TEXT_MAX_ROWS=1000;
export type NativeTextProfile='exercise4'|'counts3'|'counts5'|'magnitudes3'|'magnitudes5';
export type NativeTextDecimal=Readonly<{kind:'decimal';negative:boolean;coefficient:string;exponent:number}>|Readonly<{kind:'blank'|'invalid'}>;
export type NativeTextField=Readonly<{id:string;start:number;width:number;raw:string;decimal:NativeTextDecimal|null}>;
export type NativeTextRow=Readonly<{index:number;object:string;raw:string;fields:readonly NativeTextField[]}>;
export type NativeTextData=Readonly<{header:string;profile:NativeTextProfile;separator:'.'|',';rows:readonly NativeTextRow[]}>;
export class NativeTextError extends Error{constructor(readonly code:'size'|'encoding'|'header'|'row'|'owner'|'separator'|'csv'|'csvProfile',readonly row=0){super('Native text '+code);this.name='NativeTextError';}}
const owned=new WeakMap<NativeTextData,readonly number[]>();
const prefix='Object ID    MJD(Days) ',coordinate='     RA           Dec    ',suffix='     Z      Spectrum     Comments';
export function nativeTextHeader(profile:NativeTextProfile):string{if(profile==='exercise4')return prefix+'  V(Mag)   '+'    Z       Vel(km/s)   Comments';if(!['counts3','counts5','magnitudes3','magnitudes5'].includes(profile))throw new NativeTextError('header');const count=profile.endsWith('5')?5:3,mag=profile.startsWith('magnitudes');return prefix+coordinate+['U','B','V','R','I'].slice(0,count).map(f=>mag?'  '+f+'    ':'     '+f+'    ').join('')+suffix;}
/** Strict finite decimal spelling for lexical inspection,not a replacement for
 * native40cdb4. Native also accepts unusual zero/empty-exponent spellings and
 * checks x87 status. Those are deliberately left invalid/opaque here. ASCII
 * spaces only;separator explicit,never locale/Number-dependent. */
export function inspectNativeTextDecimal(raw:string,separator:'.'|','):NativeTextDecimal{
 if(separator!=='.'&&separator!==',')throw new NativeTextError('separator');if(/^ *$/.test(raw))return Object.freeze({kind:'blank'});const text=raw.replace(/^ +| +$/g,''),point=separator==='.'?'\\.':',',match=new RegExp('^([+-]?)(?:(\\d+)(?:'+point+'(\\d*))?|'+point+'(\\d+))(?:[eE]([+-]?\\d+))?$').exec(text);
 if(!match||text.length>96)return Object.freeze({kind:'invalid'});const exp=Number(match[5]??0);if(!Number.isSafeInteger(exp)||Math.abs(exp)>500)return Object.freeze({kind:'invalid'});let digits=((match[2]??'')+(match[3]??match[4]??'')).replace(/^0+/,''),exponent=exp-(match[3]??match[4]??'').length;if(!digits)digits='0';else while(digits.endsWith('0')){digits=digits.slice(0,-1);exponent++;}return Object.freeze({kind:'decimal',negative:match[1]==='-',coefficient:digits,exponent:digits==='0'?0:exponent});
}
function layout(profile:NativeTextProfile):readonly(readonly[string,number,number,boolean])[]{
 if(profile==='exercise4')return[['time',13,11,true],['v',25,6,true],['redshift',34,11,true],['velocity',46,11,true],['remarks',60,36,false]];
 const mag=profile.startsWith('magnitudes'),count=profile.endsWith('5')?5:3,step=mag?7:10,z=49+step*count;
 return[['time',13,11,true],['raHours',26,2,true],['raMinutes',29,2,true],['raSeconds',32,4,true],['decSign',38,1,false],['decDegrees',39,2,true],['decMinutes',42,2,true],['decSeconds',45,2,true],...['u','b','v','r','i'].slice(0,count).map((f,i)=>[f,49+i*step,step-1,true]as const),['redshift',z,11,true],['type',z+12,12,false],['remarks',z+25,36,false]];
}
export function parseNativeTextResults(bytes:Uint8Array,separator:'.'|','):NativeTextData{
 if(!(bytes instanceof Uint8Array)||bytes.length>NATIVE_TEXT_MAX_BYTES)throw new NativeTextError('size');if(separator!=='.'&&separator!==',')throw new NativeTextError('separator');bytes=Uint8Array.from(bytes);if(bytes.some(b=>!(b>=32&&b<=126||b===176||b===10||b===13)))throw new NativeTextError('encoding');let text='';for(const b of bytes)text+=String.fromCharCode(b);if(/\r(?!\n)/.test(text))throw new NativeTextError('encoding');const lines=text.split(/\r?\n/);if(lines.at(-1)==='')lines.pop();const header=lines.shift()??'',profile=(['exercise4','counts3','counts5','magnitudes3','magnitudes5']as const).find(p=>nativeTextHeader(p)===header);if(!profile)throw new NativeTextError('header');if(lines.length>NATIVE_TEXT_MAX_ROWS)throw new NativeTextError('size');const fields=layout(profile),minimum=fields.at(-1)![1]-1;
 const rows=lines.map((raw,i)=>{if(raw.length<minimum||raw.length>1024)throw new NativeTextError('row',i+1);const object=raw.slice(0,11).replace(/ +$/,'');if(!object)throw new NativeTextError('row',i+1);return Object.freeze({index:i+1,object,raw,fields:Object.freeze(fields.map(([id,start,width,numeric])=>{const value=raw.slice(start-1,start-1+width);return Object.freeze({id,start,width,raw:value,decimal:numeric?inspectNativeTextDecimal(value,separator):null});}))});});
 const result=Object.freeze({header,profile,separator,rows:Object.freeze(rows)});owned.set(result,Object.freeze([...bytes]));return result;
}
export function nativeTextBytes(data:NativeTextData):Uint8Array{const bytes=owned.get(data);if(!bytes)throw new NativeTextError('owner');return Uint8Array.from(bytes);}
