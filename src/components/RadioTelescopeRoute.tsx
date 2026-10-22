import {useState} from 'react';
import RadioControlPanel from './RadioControlPanel';
import {INITIAL_RADIO_CONTROL,RANDOM_ACCESS_RANGE_MS,type RadioControlState,type RadioEnvironment} from '../core/radioControl';
import {INITIAL_RADIO_LAB,RADIO_COMPILED_OPTIONS,RADIO_LAB_CONSTANTS,type RadioLabState} from '../core/radioAntenna';
import {t} from '../i18n';

/** Scenario inputs at first use: the FormCreate dome byte 0 (RC-01) and nothing supplied. The learner applies the recovered
 * compiled defaults (diameter 100, access option off) or other values explicitly; the observatory dome is not linked. */
const UNSUPPLIED_ENVIRONMENT:RadioEnvironment=Object.freeze({domeByte:0,accessOptionByte:false,dishDiameterMeters:null,otherWindowItemsVisible:false});

export type RadioTelescopeRouteProps=Readonly<{
 /** The route is shown. While false the panel presents no dialog or box; its timers keep running. */
 active:boolean;
 /** A project operation runs: presentation is suppressed and the panel timers pause without catch-up. */
 busy:boolean;
 onModalPresentedChange:(presented:boolean)=>void;
}>;

/**
 * WEB route workspace for the recovered radio telescope controls (docs/RADIO-SAVED-ROWS-INTEGRATION.md). The control,
 * scenario and antenna states live here, so the 100 ms slew updates re-render only this subtree. The chosen scenario is
 * the recovered compiled option defaults; nothing is read from a classroom options file, the observatory dome, the host
 * clock or a random source. The state is temporary: it is not part of any investigation file.
 */
export default function RadioTelescopeRoute({active,busy,onModalPresentedChange}:RadioTelescopeRouteProps){
 const [state,setState]=useState<RadioControlState>(INITIAL_RADIO_CONTROL);
 const [environment,setEnvironment]=useState<RadioEnvironment>(UNSUPPLIED_ENVIRONMENT);
 const [antenna,setAntenna]=useState<RadioLabState>(INITIAL_RADIO_LAB);
 const o=RADIO_COMPILED_OPTIONS;
 return <div className="radio-route" data-testid="radio-route">
  <section className="card radio-route-scenario" aria-labelledby="radio-route-scenario-title" data-testid="radio-route-scenario">
   <h2 id="radio-route-scenario-title">{t('radioRoute.scenario.heading')}</h2>
   <ul>
    <li data-testid="radio-route-scenario-options">{t('radioRoute.scenario.options',{max:o.maxRateIndex,base:o.rateBase})}</li>
    <li data-testid="radio-route-scenario-environment">{t('radioRoute.scenario.environment')}</li>
    <li data-testid="radio-route-scenario-access">{t('radioRoute.scenario.access',{range:RANDOM_ACCESS_RANGE_MS})}</li>
    <li data-testid="radio-route-scenario-slew">{t('radioRoute.scenario.slew',{interval:RADIO_LAB_CONSTANTS.slewTimerIntervalMs})}</li>
    <li data-testid="radio-route-scenario-gates">{t('radioRoute.scenario.gates')}</li>
   </ul>
   <p className="radio-route-persistence" data-testid="radio-route-persistence">{t('radioRoute.persistence')}</p>
  </section>
  <RadioControlPanel state={state} environment={environment} onTransition={tr=>setState(tr.state)} onEnvironmentChange={setEnvironment}
   antenna={antenna} onAntennaTransition={tr=>setAntenna(tr.state)} antennaOptions={RADIO_COMPILED_OPTIONS}
   active={active} hostBusy={busy} onModalPresentedChange={onModalPresentedChange}/>
 </div>;
}
