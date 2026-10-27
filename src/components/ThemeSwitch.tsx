import{useId,useState}from'react';
import{APP_SHELL_MESSAGES as M}from'./AppShellMessages';
import{THEME_PREFERENCES,applyThemePreference,readThemePreference,writeThemePreference,type ThemePreference}from'../theme/theme';
import'./ThemeSwitch.css';

const storage=()=>window.localStorage;
const ICONS:Readonly<Record<ThemePreference,string>>={
 system:'M3 4h14v9H3zM7 16h6M10 13v3',
 light:'M10 6.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7M10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4',
 dark:'M15.5 12.5A6.5 6.5 0 0 1 7.5 4.5a6.5 6.5 0 1 0 8 8z',
};

/** System / Light / Dark segmented control. Presentation only; the preference is a per-browser convenience. */
export default function ThemeSwitch(){
 const [preference,setPreference]=useState<ThemePreference>(()=>readThemePreference(storage));
 const name=useId();
 function choose(next:ThemePreference){setPreference(next);applyThemePreference(document.documentElement,next);writeThemePreference(storage,next);}
 return <fieldset className="theme-switch"><legend className="visually-hidden">{M.theme.legend}</legend>
  {THEME_PREFERENCES.map(option=><label key={option} className="theme-option"><input type="radio" name={name} value={option} checked={preference===option} onChange={()=>choose(option)}/>
   <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false"><path d={ICONS[option]}/></svg><span>{M.theme[option]}</span></label>)}
 </fieldset>;
}
