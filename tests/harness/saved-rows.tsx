// Test-only harness for tests/pulsar-saved-rows.spec.ts (docs/PULSAR-SAVED-ROWS.md, docs/TEST-HARNESSES.md). Ported from
// the integration harness (task-3/claude-radio-saved-rows-app-integration/harness/saved-rows.js, 2026-10-22).
// Host API: window.__savedRows.render(props)/unmount(), window.__mount() (remount after unmount), window.__modalLog (the
// default onModalChange sink; render() merges given props over it), ?plr=1 (also mounts the PLR analysis workbench) and
// ?strict=1 (React StrictMode).
import '../../src/style.css';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import PulsarSavedRows,{type PulsarSavedRowsProps} from '../../src/components/PulsarSavedRows.tsx';
import {mountPulsarWorkbench} from '../../src/components/PulsarAnalysis.tsx';

const w=window as unknown as {__modalLog:boolean[];__savedRows:unknown;__mount:()=>void;__harnessReady:boolean};
const q=new URLSearchParams(location.search),strict=q.get('strict')==='1';
const main=document.createElement('main');main.style.cssText='max-width:1100px;margin:0 auto;padding:12px';
const plrRoot=document.createElement('div'),savedRoot=document.createElement('div');
plrRoot.id='plr-root';savedRoot.id='saved-rows-root';main.append(plrRoot,savedRoot);
document.getElementById('harness-root')!.replaceWith(main);

w.__modalLog=[];
const defaults:PulsarSavedRowsProps={onModalChange:open=>w.__modalLog.push(open)};
function mount(){
 const root=createRoot(savedRoot);
 const render=(props:PulsarSavedRowsProps)=>{const element=<PulsarSavedRows {...defaults} {...props}/>;root.render(strict?<StrictMode>{element}</StrictMode>:element);};
 render({});
 w.__savedRows=Object.freeze({render,unmount:()=>root.unmount()});
}
if(q.get('plr')==='1')mountPulsarWorkbench(plrRoot);
mount();
w.__mount=mount;
w.__harnessReady=true;
