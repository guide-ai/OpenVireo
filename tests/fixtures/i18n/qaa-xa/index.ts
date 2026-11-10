import type {LocaleBundle} from '../../../../src/i18n/catalog';
import messages from './qaa-xa.json';
import originals from './originals.json';
import {SOUND_QAA} from './maps/sound';
/** Front SC8 (docs/I18N.md): a test-only fixture of a partial language before its release, laid out as a real language
 * directory (src/i18n/<dir>/): three catalog keys (two in the core, one in the fits area), one partial map and one original. Tag
 * `qaa-XA` is from the range ISO 639 reserves for local use; the text is a made-up Esperanto-like stand-in, not a translation.
 * Tests reach it through a registry entry with `path` (tests/fixtures/i18n/partial.ts); it is never in the production build. */
export const FIXTURE:LocaleBundle=Object.freeze({
 language:'qaa-XA',
 messages,
 maps:Object.freeze({sound:SOUND_QAA}),
 originals,
});
