/** Front ES0 [W]: the shape check every translated `*Messages.ts` map must pass against its English map (docs/I18N.md):
 * the same keys at every depth, the same kind (string, function, array or object), the same {param} set for every string
 * and the same arity for every function. Returns the problems as `path: reason` lines (empty when the maps match). Used by
 * src/i18n/infrastructure.test.ts on the pseudo-locale now and on each Spanish map from ES1. */
const kind=(v:unknown)=>Array.isArray(v)?'array':v===null?'null':typeof v;
const params=(text:string)=>[...new Set([...text.matchAll(/\{(\w+)\}/g)].map(m=>m[1]))].sort().join('|');
export function mapParity(english:unknown,translated:unknown,at='$'):string[]{
 const a=kind(english),b=kind(translated);
 if(a!==b)return [`${at}: ${b} instead of ${a}`];
 if(a==='string')return params(english as string)===params(translated as string)?[]:[`${at}: parameters {${params(translated as string)}} instead of {${params(english as string)}}`];
 if(a==='function')return (english as ()=>unknown).length===(translated as ()=>unknown).length?[]:[`${at}: function arity ${(translated as ()=>unknown).length} instead of ${(english as ()=>unknown).length}`];
 if(a!=='object'&&a!=='array')return Object.is(english,translated)?[]:[`${at}: ${String(translated)} instead of ${String(english)}`];
 const e=english as Record<string,unknown>,t=translated as Record<string,unknown>,problems:string[]=[];
 for(const key of Object.keys(e))if(!Object.hasOwn(t,key))problems.push(`${at}.${key}: missing`);else problems.push(...mapParity(e[key],t[key],`${at}.${key}`));
 for(const key of Object.keys(t))if(!Object.hasOwn(e,key))problems.push(`${at}.${key}: not in the English map`);
 return problems;
}
