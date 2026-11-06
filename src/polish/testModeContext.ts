import {createContext} from 'react';
import {COMPILED_TEST_MODE} from '../core/testMode';
/** Front T3: the page's Test Mode (env+0x2e7c, core/testMode.ts) for the readers below the shell: the camera exposure timer,
 * the Multi-Spec timer, the dome sound and the HR report. VIREO reads the byte when each timer ticks, so the consumers keep it
 * in a ref read at the tick. Compiled off outside the provider. */
export const TestModeContext=createContext<boolean>(COMPILED_TEST_MODE);
