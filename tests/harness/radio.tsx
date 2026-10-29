// Test-only harness for tests/radio-*.spec.ts (docs/RADIO-ANTENNA.md, docs/TEST-HARNESSES.md). Ported from the
// integration harness (task-3/claude-radio-saved-rows-app-integration/harness/radio.js, 2026-10-22).
// Lifted states in StrictMode, with the host API the specs use as window.__radioHarness: counts of applied control/antenna
// transitions, their outcomes, setOptions/setEnvironment/patchAntenna (host-supplied or restored state, not a UI path)
// and unmount. Query: ?transit=1 ?instant=1 ?limits=1 ?manualTick=1 ?rateBase= ?maxRateIndex= ?latitude= and
// ?synthetic=scope-modal (a pending 1 ms ScopeTimer held by dome byte 3 while the coordinate dialog is open; not
// reachable through the UI). Default options are the recovered compiled defaults; scenario inputs start unsupplied.
import '../../src/style.css';
import {StrictMode,useState} from 'react';
import {createRoot} from 'react-dom/client';
import RadioControlPanel from '../../src/components/RadioControlPanel.tsx';
import {INITIAL_RADIO_CONTROL,enterRadioPulsarsExercise,selectRadioAccess,type RadioControlState,type RadioEnvironment} from '../../src/core/radioControl.ts';
import {INITIAL_RADIO_LAB,RADIO_COMPILED_OPTIONS,activateRadioLab,openSetCoordinates,toggleTracking,type RadioLabOptions,type RadioLabState} from '../../src/core/radioAntenna.ts';

const q=new URLSearchParams(location.search),number=(key:string,fallback:number)=>q.has(key)?Number(q.get(key)):fallback;
const options:RadioLabOptions={...RADIO_COMPILED_OPTIONS,transitTelescope:q.get('transit')==='1',instantSlew:q.get('instant')==='1',limitsEnabled:q.get('limits')==='1',
 rateBase:number('rateBase',RADIO_COMPILED_OPTIONS.rateBase),maxRateIndex:number('maxRateIndex',RADIO_COMPILED_OPTIONS.maxRateIndex),
 latitudeRadians:number('latitude',RADIO_COMPILED_OPTIONS.latitudeRadians)};
let initial:{state:RadioControlState;environment:RadioEnvironment;antenna:RadioLabState}=
 {state:INITIAL_RADIO_CONTROL,environment:{domeByte:0,accessOptionByte:false,dishDiameterMeters:null,otherWindowItemsVisible:false},antenna:INITIAL_RADIO_LAB};
if(q.get('synthetic')==='scope-modal'){
 const environment:RadioEnvironment={domeByte:3,accessOptionByte:true,dishDiameterMeters:100,otherWindowItemsVisible:false};
 const state=selectRadioAccess(enterRadioPulsarsExercise(INITIAL_RADIO_CONTROL).state,environment).state;
 const antenna=openSetCoordinates(toggleTracking(activateRadioLab(INITIAL_RADIO_LAB,options).state,options).state,options).state;
 initial={state,environment,antenna};
}
type Patch<T>=Partial<Record<keyof T,unknown>>;
const api={counts:{control:0,antenna:0},outcomes:[] as string[],
 setOptions(_:Patch<RadioLabOptions>){},setEnvironment(_:Patch<RadioEnvironment>){},patchAntenna(_:Patch<RadioLabState>){},unmount(){}};
(window as unknown as {__radioHarness:typeof api}).__radioHarness=api;

function Host(){
 const [state,setState]=useState(initial.state),[environment,setEnvironment]=useState(initial.environment);
 const [antenna,setAntenna]=useState(initial.antenna),[antennaOptions,setOptions]=useState(options);
 api.setOptions=patch=>setOptions(o=>({...o,...patch} as RadioLabOptions));
 api.setEnvironment=patch=>setEnvironment(e=>({...e,...patch} as RadioEnvironment));
 api.patchAntenna=patch=>setAntenna(a=>Object.freeze({...a,...patch} as RadioLabState));
 return <RadioControlPanel state={state} environment={environment} onEnvironmentChange={setEnvironment} antenna={antenna}
  antennaOptions={antennaOptions} autoSlewTimer={q.get('manualTick')!=='1'}
  onTransition={tr=>{api.counts.control++;api.outcomes.push(tr.outcome);setState(tr.state);}}
  onAntennaTransition={tr=>{api.counts.antenna++;api.outcomes.push(tr.outcome);setAntenna(tr.state);}}/>;
}
const root=createRoot(document.getElementById('harness-root')!);
root.render(<main style={{maxWidth:1100,margin:'0 auto',padding:12}}><StrictMode><Host/></StrictMode></main>);
api.unmount=()=>root.unmount();
