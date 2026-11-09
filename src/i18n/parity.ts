/** Front ES0 [W]: the shape check every translated `*Messages.ts` map must pass against its English map (docs/I18N.md):
 * the same keys at every depth, the same kind (string, function, array or object), the same {param} set for every string
 * and the same arity for every function. Returns the problems as `path: reason` lines (empty when the maps match). Used by
 * src/i18n/infrastructure.test.ts on the pseudo-locale now and on each Spanish map from ES1. */
const kind=(v:unknown)=>Array.isArray(v)?'array':v===null?'null':typeof v;
const params=(text:string)=>[...new Set([...text.matchAll(/\{(\w+)\}/g)].map(m=>m[1]))].sort().join('|');
export function mapParity(english:unknown,translated:unknown,at='$',options:Readonly<{partial?:boolean}>={}):string[]{
 const a=kind(english),b=kind(translated);
 if(a!==b)return [`${at}: ${b} instead of ${a}`];
 if(a==='string')return params(english as string)===params(translated as string)?[]:[`${at}: parameters {${params(translated as string)}} instead of {${params(english as string)}}`];
 if(a==='function')return (english as ()=>unknown).length===(translated as ()=>unknown).length?[]:[`${at}: function arity ${(translated as ()=>unknown).length} instead of ${(english as ()=>unknown).length}`];
 if(a!=='object'&&a!=='array')return Object.is(english,translated)?[]:[`${at}: ${String(translated)} instead of ${String(english)}`];
 const e=english as Record<string,unknown>,t=translated as Record<string,unknown>,problems:string[]=[];
 for(const key of Object.keys(e))if(!Object.hasOwn(t,key)){if(!options.partial)problems.push(`${at}.${key}: missing`);}else problems.push(...mapParity(e[key],t[key],`${at}.${key}`,options));
 for(const key of Object.keys(t))if(!Object.hasOwn(e,key))problems.push(`${at}.${key}: not in the English map`);
 return problems;
}
/** Front ES1 [W]: a partial translated map completed with English (before ES-REL a map may translate only the strings of the
 * sub-fronts merged so far, as es.json may). Objects and arrays are walked; present leaves replace the English ones. Frozen
 * English parts give frozen results. Check the shape with mapParity(…,{partial:true}) first. */
export function completeWithEnglish<T>(english:T,translated:unknown):T{
 const k=kind(english);
 if((k!=='object'&&k!=='array')||kind(translated)!==k)return (translated===undefined?english:translated) as T;
 const e=english as Record<string,unknown>,t=translated as Record<string,unknown>;
 const out:Record<string,unknown>|unknown[]=k==='array'?[]:{};
 for(const key of Object.keys(e))(out as Record<string,unknown>)[key]=Object.hasOwn(t,key)?completeWithEnglish(e[key],t[key]):e[key];
 return (Object.isFrozen(english)?Object.freeze(out):out) as T;
}
