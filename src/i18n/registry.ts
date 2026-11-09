import {activeBundle} from './index';
/** Front ES0 [W]: the `*Messages.ts` maps are chosen per load (docs/I18N.md). Each English map stays the typed source; a
 * module exports `X=pickMessages('x',X_EN)`, which runs after src/boot.ts settled the language (the maps evaluate inside
 * the app chunk), so consumers keep reading `X.some.text`. A Spanish map is typed `Translation<typeof X_EN>`. */
export type Translation<T>=T extends string?string
 :T extends (...args:infer A)=>infer R?(...args:A)=>R extends string?string:R
 :T extends readonly (infer U)[]?readonly Translation<U>[]
 :T extends object?{readonly [K in keyof T]:Translation<T[K]>}
 :T;
const registered=new Map<string,unknown>();
/** The registered map for this load: the bundle's own map for `id`, a derived one (dev pseudo-locale), or `english`. */
export function pickMessages<T>(id:string,english:T):T{
 registered.set(id,english);
 const bundle=activeBundle();if(!bundle)return english;
 if(bundle.maps&&Object.hasOwn(bundle.maps,id))return bundle.maps[id] as T;
 return bundle.deriveMap?bundle.deriveMap(english):english;
}
/** Every id picked so far in this load, with its English map (tests check the full list and the parity of each map). */
export const pickedMessages=():ReadonlyMap<string,unknown>=>registered;
