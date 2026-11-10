// Test-only harness for tests/help-unicode.spec.ts and tests/scripts/help-unicode.scripts.ts (docs/I18N.md, "Script groundwork:
// Unicode help (SC7)", docs/TEST-HARNESSES.md). It mounts VIREO's shared help viewer (CAMHLP.LST, the camera's Help) and the Exit
// Observatory reminder with a stand-in help set in another script (tests/fixtures/help-unicode) given through HelpSetContext, on a
// page whose <html lang> is that script's language, with the app's stylesheets (tokens, base, the script sheet of SC3). The viewer
// chrome stays English (no catalog); only the help text is the fixture's. Query: ?set=ja|hi|ru (none: VIREO's originals only).
import '../../src/i18n/useEnglish';
import '../../src/focusAfterLayout';
import '../../src/theme/tokens.css';
import '../../src/theme/base.css';
import '../../src/theme/scripts.css';
import '../../src/style.css';
import '../../src/observatory/observatory-dialogs.css';
import {StrictMode,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import CleaHelp from '../../src/clusters/CleaHelp';
import {ExitObservatoryDialog} from '../../src/help/HelpMenus';
import {HELP_FILES} from '../../src/help/helpFiles';
import {HelpSetContext} from '../../src/help/helpTranslation';
import {UNICODE_HELP,fixtureHelpSet} from '../fixtures/help-unicode';

const fixture=UNICODE_HELP.find(f=>f.id===new URLSearchParams(location.search).get('set'));
if(fixture)document.documentElement.lang=fixture.htmlLang;
const set=fixture?fixtureHelpSet(fixture):null;
function Page(){
 const [exit,setExit]=useState(false),button=useRef<HTMLButtonElement>(null);
 return <HelpSetContext.Provider value={set}>
  <div className="card">
   <h1>Unicode help harness (test only)</h1>
   <CleaHelp list={HELP_FILES['CAMHLP.LST']} testId="uh"/>
   <button type="button" ref={button} className="secondary-button" data-testid="uh-exit" onClick={()=>setExit(true)}>Exit Observatory</button>
   {exit&&<ExitObservatoryDialog onClose={()=>{setExit(false);button.current?.focus();}}/>}
  </div>
 </HelpSetContext.Provider>;
}
const main=document.createElement('main');main.id='root';
document.getElementById('harness-root')!.replaceWith(main);
createRoot(main).render(<StrictMode><Page/></StrictMode>);
