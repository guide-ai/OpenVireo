import {describe,it,expect} from 'vitest';
import provenance from '../../docs/RADIO-CONTROL-PROVENANCE.json';
import {
 INITIAL_RADIO_CONTROL,NATIVE_CAPTIONS,NO_SCOPE_ID,RADIO_SCOPE_ID,clickRadioSwitch,closeRadioPanel,enterRadioPulsarsExercise,
 menuCaptionText,parseDishDiameter,pressRadioSwitchKey,radioIdCaptionLabel,radioIdCaptionText,reopenRadioPanel,scopeTimerTick,
 selectRadioAccess,type RadioControlState,type RadioEnvironment,type RadioOutcome,type RadioTransition,
} from './radioControl';
import {RADIO_MESSAGES_EN,createRadioTranslator} from '../components/RadioMessages';

const env=(over:Partial<RadioEnvironment>={}):RadioEnvironment=>({domeByte:1,accessOptionByte:true,dishDiameterMeters:40,otherWindowItemsVisible:false,...over});
const entered=()=>enterRadioPulsarsExercise(INITIAL_RADIO_CONTROL).state;
const accessed=(e=env())=>selectRadioAccess(entered(),e).state;
const outcomes:RadioOutcome[]=[];
const track=(t:RadioTransition)=>{outcomes.push(t.outcome);for(const step of t.steps)expect(provenance.contracts.map(c=>c.id)).toContain(step);return t;};

describe('RC-01 initial state from DFM, FormCreate and first paint',()=>{
 it('starts with every scope byte at the none sentinel and the radio switch disabled and Off',()=>{
  const s=INITIAL_RADIO_CONTROL;
  expect([s.opticalScopeByte,s.radioScopeByte,s.currentScopeByte]).toEqual([NO_SCOPE_ID,NO_SCOPE_ID,NO_SCOPE_ID]);
  expect(s.radioSwitchEnabled).toBe(false);expect(s.radioSwitchCaption).toBe('Off');expect(s.radioSwitchActive).toBe(false);
  expect(radioIdCaptionLabel(s)).toBe('No Telescope Accessed');expect(s.windowMenuEnabled).toBe(false);expect(s.radioWinVisible).toBe(false);
  expect([s.item408Enabled,s.item454Enabled,s.requestedScopeByte]).toEqual([null,null,null]);expect(Object.isFrozen(s)).toBe(true);
 });
 it('delivers no click or Enter to the disabled switch, before or after exercise entry',()=>{
  for(const s of [INITIAL_RADIO_CONTROL,entered()]){
   const c=track(clickRadioSwitch(s,env()));expect(c.outcome).toBe('switch-unavailable');expect(c.state).toBe(s);expect(c.changed).toBe(false);
   expect(track(pressRadioSwitchKey(s,env(),'\r')).outcome).toBe('switch-unavailable');
  }
 });
});

describe('RC-02/RC-03/RC-04 exercise entry and immediate radio access',()=>{
 it('hides the optical switch, shows the radio switch and makes item +0x454 visible',()=>{
  const t=track(enterRadioPulsarsExercise(INITIAL_RADIO_CONTROL));
  expect(t.outcome).toBe('exercise-entered');expect(t.state.opticalSwitchVisible).toBe(false);expect(t.state.radioSwitchVisible).toBe(true);expect(t.state.item454Visible).toBe(true);
  expect(t.state.radioSwitchEnabled).toBe(false);
 });
 it('keeps the access command unreachable before exercise entry',()=>{
  const t=track(selectRadioAccess(INITIAL_RADIO_CONTROL,env()));expect(t.outcome).toBe('exercise-required');expect(t.state).toBe(INITIAL_RADIO_CONTROL);
 });
 it('with dome byte 1 and the option byte set, records id 3, enables the switch and forms the IntToStr caption',()=>{
  const t=track(selectRadioAccess(entered(),env({dishDiameterMeters:40})));
  expect(t.outcome).toBe('accessed');
  expect([t.state.requestedScopeByte,t.state.currentScopeByte,t.state.radioScopeByte]).toEqual([RADIO_SCOPE_ID,RADIO_SCOPE_ID,RADIO_SCOPE_ID]);
  expect(t.state.radioSwitchEnabled).toBe(true);expect(t.state.item408Enabled).toBe(true);expect(t.state.radioMenuChecked).toBe(true);
  expect(radioIdCaptionLabel(t.state)).toBe('40 Meter Radio Telescope');
  expect(t.state.radioPanelShown).toBe(false);expect(t.state.scopeTimerEnabled).toBe(false);expect(t.state.busyCursor).toBe(false);
 });
 it('shows the panel on the immediate branch only when the switch is already active (0x58b5d8)',()=>{
  const synthetic:RadioControlState={...entered(),radioSwitchActive:true};
  expect(selectRadioAccess(synthetic,env()).state.radioPanelShown).toBe(true);
 });
 it('ignores Radio again once [+0x3819] = 3',()=>{
  const s=accessed(),t=track(selectRadioAccess(s,env({domeByte:0,accessOptionByte:false})));
  expect(t.outcome).toBe('already-accessed');expect(t.state).toBe(s);
 });
 it('rejects atomically when the diameter needed for the caption is not supplied',()=>{
  const s=entered(),t=track(selectRadioAccess(s,env({dishDiameterMeters:null})));
  expect(t.outcome).toBe('diameter-required');expect(t.state).toBe(s);expect(t.changed).toBe(false);
 });
});

describe('RC-05/RC-06 deferred access and ScopeTimer completion',()=>{
 it('defers when the dome byte is not 1: disables +0x408, keeps the switch disabled, arms a 1 ms timer with the option byte',()=>{
  const t=track(selectRadioAccess(entered(),env({domeByte:0})));
  expect(t.outcome).toBe('access-requested');expect(t.state.item408Enabled).toBe(false);expect(t.state.radioSwitchEnabled).toBe(false);
  expect(t.state.requestedScopeByte).toBe(3);expect(t.state.radioScopeByte).toBe(4);expect(t.state.currentScopeByte).toBe(4);
  expect(t.state.scopeTimerEnabled).toBe(true);expect(t.state.scopeTimerIntervalMs).toBe(1);expect(t.state.busyCursor).toBe(true);
  expect(t.state.idCaption).toEqual({kind:'radio-request',literalAddress:'0x58c440'});expect(radioIdCaptionLabel(t.state)).toBeNull();
 });
 it('marks the Random(8000) interval as not reproduced when the option byte is clear, even with the dome open',()=>{
  const t=track(selectRadioAccess(entered(),env({domeByte:1,accessOptionByte:false})));
  expect(t.outcome).toBe('access-requested');expect(t.state.scopeTimerIntervalMs).toBeNull();
 });
 it('re-arms on a repeated request while pending',()=>{
  const first=selectRadioAccess(entered(),env({domeByte:0,accessOptionByte:false})).state;
  const again=track(selectRadioAccess(first,env({domeByte:0,accessOptionByte:true})));
  expect(again.outcome).toBe('access-rerequested');expect(again.state.scopeTimerIntervalMs).toBe(1);
 });
 it('ignores ticks while the dome byte is 3 and completes on the next tick otherwise (including dome byte 0)',()=>{
  const pending=selectRadioAccess(entered(),env({domeByte:0})).state;
  const wait=track(scopeTimerTick(pending,env({domeByte:3})));expect(wait.outcome).toBe('timer-waiting-dome');expect(wait.state).toBe(pending);
  for(const domeByte of [0,1,2] as const){
   const t=track(scopeTimerTick(pending,env({domeByte,dishDiameterMeters:-5})));
   expect(t.outcome).toBe('accessed-by-timer');expect(t.state.scopeTimerEnabled).toBe(false);expect(t.state.busyCursor).toBe(false);
   expect(t.state.radioSwitchEnabled).toBe(true);expect(t.state.item408Enabled).toBe(true);expect([t.state.radioScopeByte,t.state.currentScopeByte]).toEqual([3,3]);
   expect(radioIdCaptionLabel(t.state)).toBe('-5 Meter Radio Telescope');expect(t.state.radioPanelShown).toBe(false);
  }
  expect(track(scopeTimerTick(INITIAL_RADIO_CONTROL,env())).outcome).toBe('timer-idle');
  expect(track(scopeTimerTick(pending,env({dishDiameterMeters:null}))).state).toBe(pending);
 });
});

describe('RC-07/RC-08 switch toggle and change handler',()=>{
 it('On shows the panel window, RadioWin and Window menu, and disables item +0x454',()=>{
  const t=track(clickRadioSwitch(accessed(),env()));
  expect(t.outcome).toBe('switched-on');expect(t.state.radioSwitchActive).toBe(true);expect(t.state.radioSwitchCaption).toBe('On');
  expect(t.state.radioWinVisible).toBe(true);expect(t.state.windowMenuEnabled).toBe(true);expect(t.state.item454Enabled).toBe(false);
  expect(t.state.radioPanelShown).toBe(true);expect(t.state.radioSwitchEnabled).toBe(true);expect(radioIdCaptionLabel(t.state)).toBe('40 Meter Radio Telescope');
 });
 it('Off hides them and recomputes Window1 from the other window items',()=>{
  const on=clickRadioSwitch(accessed(),env()).state;
  for(const other of [false,true]){
   const t=track(clickRadioSwitch(on,env({otherWindowItemsVisible:other})));
   expect(t.outcome).toBe('switched-off');expect(t.state.radioSwitchCaption).toBe('Off');expect(t.state.radioWinVisible).toBe(false);
   expect(t.state.windowMenuEnabled).toBe(other);expect(t.state.item454Enabled).toBe(true);expect(t.state.radioPanelShown).toBe(false);
  }
 });
 it('toggles only for Enter (#13) in the key handler',()=>{
  const s=accessed();
  for(const key of ['a',' ','\n','Enter','\r\n'])expect(track(pressRadioSwitchKey(s,env(),key)).state).toBe(s);
  expect(track(pressRadioSwitchKey(s,env(),'\r')).state.radioSwitchActive).toBe(true);
 });
 it('re-forms the caption on change only when [+0x381a] is not 3',()=>{
  const s={...accessed(),currentScopeByte:0,radioScopeByte:3} as RadioControlState;
  const t=clickRadioSwitch(s,env({dishDiameterMeters:12}));expect(radioIdCaptionLabel(t.state)).toBe('12 Meter Radio Telescope');expect(t.state.currentScopeByte).toBe(3);
  const rejected=clickRadioSwitch(s,env({dishDiameterMeters:null}));expect(rejected.outcome).toBe('diameter-required');expect(rejected.state).toBe(s);expect(rejected.state.radioSwitchActive).toBe(false);
  expect(radioIdCaptionLabel(clickRadioSwitch(accessed(),env({dishDiameterMeters:99})).state)).toBe('40 Meter Radio Telescope');
 });
});

describe('RC-09/RC-10 panel window cancel and reentry',()=>{
 it('closes the panel window keeping the switch On, and reopens it from RadioWin',()=>{
  const on=clickRadioSwitch(accessed(),env()).state,closed=track(closeRadioPanel(on));
  expect(closed.outcome).toBe('panel-closed');expect(closed.state.radioPanelShown).toBe(false);expect(closed.state.radioSwitchActive).toBe(true);expect(closed.state.radioWinVisible).toBe(true);
  expect(track(closeRadioPanel(closed.state)).outcome).toBe('panel-not-shown');
  const back=track(reopenRadioPanel(closed.state));expect(back.outcome).toBe('panel-reopened');expect(back.state.radioPanelShown).toBe(true);
 });
 it('cannot reopen from a hidden RadioWin item',()=>{
  const off=clickRadioSwitch(clickRadioSwitch(accessed(),env()).state,env()).state;
  expect(track(reopenRadioPanel(off)).outcome).toBe('menu-item-hidden');expect(track(reopenRadioPanel(INITIAL_RADIO_CONTROL)).state).toBe(INITIAL_RADIO_CONTROL);
 });
 it('runs a complete off → on → close → reopen → off → on cycle with one access',()=>{
  let s=accessed();const seq:RadioOutcome[]=[];
  for(const step of [()=>clickRadioSwitch(s,env()),()=>closeRadioPanel(s),()=>reopenRadioPanel(s),()=>clickRadioSwitch(s,env()),()=>clickRadioSwitch(s,env())]){const t=step();seq.push(t.outcome);s=t.state;}
  expect(seq).toEqual(['switched-on','panel-closed','panel-reopened','switched-off','switched-on']);expect(s.radioPanelShown).toBe(true);expect(s.radioScopeByte).toBe(3);
 });
});

describe('inputs, captions and presentation catalog',()=>{
 it('parses the Int32 diameter strictly and formats like IntToStr',()=>{
  expect(['40','-5','0','-0','2147483647','-2147483648'].map(parseDishDiameter)).toEqual([40,-5,0,0,2147483647,-2147483648]);
  for(const bad of ['',' 40','40 ','4.0','+4','2147483648','-2147483649','1e3','99999999999','٤٠',null,40])expect(()=>parseDishDiameter(bad)).toThrow();
  expect(radioIdCaptionText(0)).toBe('0 Meter Radio Telescope');expect(()=>radioIdCaptionText(1.5)).toThrow();
 });
 it('rejects malformed environments before any transition',()=>{
  for(const bad of [{domeByte:4},{domeByte:'1'},{accessOptionByte:1},{dishDiameterMeters:2**31},{otherWindowItemsVisible:null}])
   expect(()=>selectRadioAccess(entered(),{...env(),...bad} as unknown as RadioEnvironment)).toThrow('Invalid radio environment');
 });
 it('displays VCL captions without accelerators',()=>{
  expect(menuCaptionText(NATIVE_CAPTIONS.exercise)).toBe('Radio Astronomy of Pulsars');expect(menuCaptionText(NATIVE_CAPTIONS.window)).toBe('Radio Telescope Control Panel');expect(menuCaptionText('A&&B')).toBe('A&B');
 });
 it('has a catalogued message for every outcome and validates alternate catalogs',()=>{
  const t=createRadioTranslator();for(const o of new Set(outcomes))expect(t(`radio.outcome.${o}` as keyof typeof RADIO_MESSAGES_EN)).toBe(RADIO_MESSAGES_EN[`radio.outcome.${o}` as keyof typeof RADIO_MESSAGES_EN]);
  expect(t('radio.timer.random',{range:8000})).toContain('8000');expect(()=>t('radio.timer.random',{range:undefined as unknown as number})).toThrow();expect(()=>t('radio.timer.random',{range:{} as unknown as number})).toThrow();expect(()=>t('radio.timer.random')).toThrow('Missing message parameter');
  expect(()=>createRadioTranslator({...RADIO_MESSAGES_EN,'radio.timer.random':'{wrong}'})).toThrow();
  const marked=createRadioTranslator(Object.fromEntries(Object.entries(RADIO_MESSAGES_EN).map(([k,v])=>[k,'[x] '+v])) as typeof RADIO_MESSAGES_EN);
  expect(marked('radio.state.yes')).toBe('[x] yes');expect(marked('radio.menu.access',{caption:'<b>{caption}</b>'})).toBe('[x] Telescope access: <b>{caption}</b>');
 });
 it('lists every contract emitted by the transitions in the provenance packet with ranges or an explicit adaptation note',()=>{
  expect(provenance.artifact.sha256).toBe('781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c');
  expect(provenance.contracts.map(c=>c.id)).toEqual(['RC-01','RC-02','RC-03','RC-04','RC-05','RC-06','RC-07','RC-08','RC-09','RC-10']);
  for(const c of provenance.contracts)expect(c.ranges.length>0||c.id==='RC-10').toBe(true);
 });
});
