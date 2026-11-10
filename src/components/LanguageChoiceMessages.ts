import {pickMessages} from '../i18n/registry';
/** Front ES1 [W]: the language selector and its reload dialog (src/components/LanguageChoice.tsx, docs/I18N.md). Kept out of
 * en.json because the selector is a lazily loaded part: these strings arrive with its chunk, after the first render.
 * Front SC8: the options are each language's own name (its autonym, src/i18n/languages.json), not text of this map.
 * What the dialog says survives a reload was checked against what the app keeps (ES1 plan item: the risk of lost work): files the visitor saved; in this browser, confirmed
 * observation results (localStorage `openvireo.observation-notebook.v1`) and display preferences (theme, menu sections,
 * the tour, the ? key, Demonstration Mode); everything else on screen is lost. */
export const LANGUAGE_CHOICE_EN=Object.freeze({
 legend:'Idioma / Language',
 title:'Change the language?',
 reload:(language:string)=>`The page will reload in ${language}, on the same page of the site.`,
 lost:'Work that is only on screen is lost: the telescope\'s current position, running exposures, measurements, open windows, instructor mode and anything else you have not saved to a file.',
 kept:'Files you saved on your computer are not affected; Restore investigation JSON loads an investigation again. This browser also keeps your confirmed observation results and your display preferences.',
 save:'Save investigation',
 saveNote:'Save investigation downloads a file of your current work first. Then change the language.',
 change:'Change and reload',
 cancel:'Cancel',
 preview:'Preview before release: the language is chosen by the address (?lang=) and is not saved.',
 notRemembered:'This browser does not let OpenVireo store the choice, so it applies to this page load only.',
 originals:'Show VIREO\'s own texts in English',
 originalsNote:'VIREO\'s menu, window and message texts appear in English, exactly as VIREO writes them. OpenVireo\'s own texts stay in the chosen language. Applies the next time the page loads.',
 originalsNotStored:'This browser does not let OpenVireo store this option.',
});
export const LANGUAGE_CHOICE=pickMessages('languageChoice',LANGUAGE_CHOICE_EN);
