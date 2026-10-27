/** Presentation-only colour theme preference. No scientific state is involved.
 * "system" follows prefers-color-scheme; "light"/"dark" force a theme through
 * data-theme on <html>. The same key and attribute are applied before first paint
 * by the inline script in index.html, so keep both in step. */
export type ThemePreference='system'|'light'|'dark';
export const THEME_PREFERENCES:readonly ThemePreference[]=['system','light','dark'];
export const THEME_STORAGE_KEY='openvireo-theme';

type StorageLike=Pick<Storage,'getItem'|'setItem'|'removeItem'>;

export function isThemePreference(value:unknown):value is ThemePreference{
 return value==='system'||value==='light'||value==='dark';
}

/** Storage can be missing or throw (private windows, blocked site data); fall back to system. */
export function readThemePreference(storage:()=>StorageLike|null|undefined):ThemePreference{
 try{const value=storage()?.getItem(THEME_STORAGE_KEY);return value==='light'||value==='dark'?value:'system';}catch{return 'system';}
}

/** Returns false when the preference could not be stored; the theme still applies for this page. */
export function writeThemePreference(storage:()=>StorageLike|null|undefined,preference:ThemePreference):boolean{
 try{const s=storage();if(!s)return false;if(preference==='system')s.removeItem(THEME_STORAGE_KEY);else s.setItem(THEME_STORAGE_KEY,preference);return true;}catch{return false;}
}

export function applyThemePreference(root:{dataset:DOMStringMap},preference:ThemePreference):void{
 if(preference==='system')delete root.dataset.theme;else root.dataset.theme=preference;
}
