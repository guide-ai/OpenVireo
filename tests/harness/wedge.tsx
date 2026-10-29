// Test-only harness for tests/wedge-*.spec.ts (docs/WEDGE-PLOT.md, docs/TEST-HARNESSES.md). Ported from the wedge front
// harness (task-3/claude-wedge-analysis/correction-host-focus/vite.config.mjs, 2026-10-21). Like the original page it
// loads no App stylesheet. `?host=1` wraps the panel in a host simulator (not App): "hide" keeps the panel mounted but
// hidden and disabled (inactive route), "busy" disables it while visible (project operation). `?lang=es` passes
// placeholder overrides that exercise the presentation-catalog contract; they are not a reviewed translation.
import {StrictMode,useState} from 'react';
import {createRoot} from 'react-dom/client';
import WedgeLab,{type WedgeLabProps} from '../../src/components/WedgeLab.tsx';

const q=new URLSearchParams(location.search);
const ES={intro:'Datos guardados',statusEmpty:'Sin datos',detail:{hours:'hr',degrees:' grad'},rowCount:(n:number)=>n+' filas',
 awaitingAnswer:(c:string)=>'Pregunta pendiente: '+c,native:{windowCaption:'Diagrama de cuña LSS',yes:'Sí',no:'No',cancel:'Cancelar',
 retainCaption:'¿Conservar los datos actuales?',deleteCaption:'¡Confirmar borrado!',ok:'Aceptar',optionsCaption:'Opciones del diagrama'}};
const messages=(q.get('lang')==='es'?ES:undefined) as WedgeLabProps['messages'];
function Host(){
 const [hidden,setHidden]=useState(false),[busy,setBusy]=useState(false);
 return <div>
  <p><label><input type="checkbox" checked={hidden} onChange={e=>setHidden(e.target.checked)} data-testid="host-hide"/> host: route hidden</label>{' '}
   <label><input type="checkbox" checked={busy} onChange={e=>setBusy(e.target.checked)} data-testid="host-busy"/> host: project operation</label></p>
  <div hidden={hidden} data-testid="host-route"><WedgeLab messages={messages} disabled={hidden||busy}/></div>
 </div>;
}
const main=document.createElement('main');main.id='root';
document.getElementById('harness-root')!.replaceWith(main);
createRoot(main).render(<StrictMode>{q.get('host')==='1'?<Host/>:<WedgeLab messages={messages}/>}</StrictMode>);
