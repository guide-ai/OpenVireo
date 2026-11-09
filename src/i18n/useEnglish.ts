/** Front ES0: settles English for an entry that does not go through src/boot.ts: the Vitest setup (vite.config.ts) and the
 * standalone test harnesses under tests/harness (imported first, before any module that builds text). */
import {activateLocale} from './index';
activateLocale(null);
