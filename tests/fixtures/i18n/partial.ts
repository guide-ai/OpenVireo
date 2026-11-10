import type {LanguageEntry} from '../../../src/i18n/languages';
/** Front SC8 (docs/I18N.md): the registry entry of the test-only partial language tests/fixtures/i18n/qaa-xa/, laid out as a
 * language directory of src/i18n/ would be (the `path` field stands in for src/i18n/<dir>). It is how a later front adds a real
 * language before its release: the same fields, `released:false`, no `help` until its help front. */
export const PARTIAL:LanguageEntry=Object.freeze({
 tag:'qaa-XA',dir:'qaa-xa',catalog:'qaa-xa.json',path:'tests/fixtures/i18n/qaa-xa',budgetFactor:1,htmlLang:'qaa-XA',pagePath:'qaa-xa',
 autonym:'Testlingvo',englishName:'Test language',match:Object.freeze(['qaa']),released:false,
 notices:Object.freeze({language:'Ne eblis ŝargi la testlingvon; montriĝas la angla. Reŝargu por reprovi.',area:'Ne eblis ŝargi parton de la testlingva teksto; tiu parto montriĝas angle. Reŝargu por reprovi.'}),
});
