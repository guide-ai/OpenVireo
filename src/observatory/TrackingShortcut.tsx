import {createContext,useContext} from 'react';
import {t} from '../i18n';

/** Front LAUNCH-1 [W]: the page's way to reach tracking. The shell provides it: it opens the observatory (from a page without the
 * clock bar), opens the bar's "Observatory clock & spectral tracking" disclosure and focuses Turn tracking on/off. It never
 * changes tracking itself, so VIREO's tracking behaviour and its release of spectral integration stay with that one button.
 * Without a provider (a standalone harness) no shortcut is shown. */
export const TrackingShortcutContext=createContext<(()=>void)|null>(null);

/** "Show tracking control", placed beside a message that asks the student to turn tracking on. */
export default function TrackingShortcut(){
 const reveal=useContext(TrackingShortcutContext);
 if(!reveal)return null;
 return <button type="button" className="text-button tracking-shortcut" data-testid="tracking-shortcut" onClick={reveal}>{t('runningClock.shortcut')}</button>;
}
