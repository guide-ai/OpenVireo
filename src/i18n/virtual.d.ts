// Front ES-SPLIT (docs/I18N.md): the virtual modules of scripts/i18n-split.mjs. The core module of a language is its LocaleBundle
// (with `areas`), an area module a LocaleAreaPart, and the loaders module maps each split language's tag to its core.
declare module 'virtual:openvireo-i18n/loaders'{
 const loaders:Readonly<Record<string,()=>Promise<{default:import('./catalog').LocaleBundle}>>>;
 export default loaders;
}
declare module 'virtual:openvireo-i18n/*'{
 const part:import('./catalog').LocaleBundle|import('./catalog').LocaleAreaPart;
 export default part;
}
