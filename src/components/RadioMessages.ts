import en from '../i18n/en.json';
/** English presentation catalog for the radio control slice. Keys are
 * namespaced `radio.*` so the coordinator can merge them into src/i18n/en.json;
 * until then the panel accepts any translator with this key set. Native
 * captions (On/Off, IDPnl text, menu captions) are original labels and are
 * deliberately NOT in this catalog. Pure presentation data:shared English JSON;no React or scientific state imports. */
const RADIO_KEYS=["radio.title","radio.scope","radio.menu.heading","radio.menu.exercise","radio.menu.access","radio.menu.window","radio.menu.windowDisabled","radio.switch.heading","radio.switch.label","radio.switch.hint","radio.switch.disabled","radio.id.heading","radio.id.request","radio.panel.heading","radio.panel.gap","radio.panel.close","radio.timer.heading","radio.timer.fast","radio.timer.random","radio.timer.deliver","radio.timer.domeWait","radio.env.heading","radio.env.help","radio.env.dome","radio.env.dome.0","radio.env.dome.1","radio.env.dome.2","radio.env.dome.3","radio.env.option","radio.env.otherWindows","radio.env.diameter","radio.env.diameterHelp","radio.env.diameterNone","radio.env.apply","radio.env.cancel","radio.env.clear","radio.env.invalid","radio.state.heading","radio.state.radioByte","radio.state.currentByte","radio.state.requestedByte","radio.state.timer","radio.state.timerOn","radio.state.timerOff","radio.state.random","radio.state.item408","radio.state.item454","radio.state.unknown","radio.state.yes","radio.state.no","radio.state.none","radio.state.busy","radio.outcome.exercise-entered","radio.outcome.exercise-required","radio.outcome.already-accessed","radio.outcome.accessed","radio.outcome.access-requested","radio.outcome.access-rerequested","radio.outcome.timer-idle","radio.outcome.timer-waiting-dome","radio.outcome.accessed-by-timer","radio.outcome.switch-unavailable","radio.outcome.key-ignored","radio.outcome.switched-on","radio.outcome.switched-off","radio.outcome.panel-reopened","radio.outcome.menu-item-hidden","radio.outcome.panel-closed","radio.outcome.panel-not-shown","radio.outcome.diameter-required","radio.error.environment"] as const;
export type RadioMessageKey=typeof RADIO_KEYS[number];
export const RADIO_MESSAGES_EN=Object.freeze(Object.fromEntries(RADIO_KEYS.map(key=>[key,en[key]]))) as Readonly<Record<RadioMessageKey,string>>;
export type RadioTranslate=(key:RadioMessageKey,values?:Readonly<Record<string,string|number>>)=>string;
const names=(text:string)=>[...new Set([...text.matchAll(/\{(\w+)\}/g)].map(m=>m[1]))].sort();
/** Same contract as src/i18n createI18n: complete keys, identical placeholders, values inserted as text. */
export function createRadioTranslator(messages:Readonly<Record<RadioMessageKey,string>>=RADIO_MESSAGES_EN):RadioTranslate{
 const keys=Object.keys(RADIO_MESSAGES_EN) as RadioMessageKey[];
 if(!messages||Object.keys(messages).length!==keys.length||keys.some(k=>typeof messages[k]!=='string'||names(messages[k]).join('|')!==names(RADIO_MESSAGES_EN[k]).join('|')))throw new Error('Invalid radio message catalog');
 const catalog=Object.freeze({...messages});
 return (key,values={})=>{
  if(!Object.hasOwn(catalog,key))throw new Error('Unknown radio message key');
  const text=catalog[key];for(const name of names(text))if(!Object.hasOwn(values,name))throw new Error(`Missing radio message parameter: ${key}.${name}`);
  return text.replace(/\{(\w+)\}/g,(_,name:string)=>String(values[name]));
 };
}
