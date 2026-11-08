import {useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {WEB_HELP,webHelpTopic,type WebHelpBlock} from './webHelp';
import '../observatory/observatory-dialogs.css';
import './help.css';

function Block({block}:{block:WebHelpBlock}){
 switch(block.kind){
  case 'p':return <p>{block.text}</p>;
  case 'steps':return <ol>{block.items.map(s=><li key={s}>{s}</li>)}</ol>;
  case 'list':return <ul>{block.items.map(s=><li key={s}>{s}</li>)}</ul>;
  case 'map':return <div className="web-help-table"><table>
   <thead><tr><th scope="col">{block.head[0]}</th><th scope="col">{block.head[1]}</th></tr></thead>
   <tbody>{block.rows.map(([a,b])=><tr key={a}><th scope="row">{a}</th><td>{b}</td></tr>)}</tbody>
  </table></div>;
 }
}

/** Help › Help topics… (web [W]): OpenVireo's own help, written for the web site. VIREO's Windows help stays available
 * under Help › VIREO help topics…. Content is pure data in webHelp.ts. Rendered at the document root, so the header's navigation
 * styles (the menu lives in the header) never apply to it. */
export default function WebHelpDialog({onClose}:{onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),heading=useRef<HTMLHeadingElement>(null),id=useId();
 const [current,setCurrent]=useState(WEB_HELP.groups[0].topics[0].id),[moved,setMoved]=useState(false);
 useEffect(()=>{dialog.current?.showModal();},[]);
 useEffect(()=>{if(moved)heading.current?.focus();},[current,moved]);
 const topic=webHelpTopic(current);
 const open=(next:string)=>{setCurrent(next);setMoved(true);};
 return createPortal(<dialog ref={dialog} className="ob-dialog ob-wide web-help" aria-labelledby={`${id}-t`} data-testid="web-help" onCancel={e=>{e.preventDefault();onClose();}}>
  <div className="web-help-head">
   <h2 id={`${id}-t`}>{WEB_HELP.caption}</h2>
   <button type="button" className="secondary-button" data-testid="web-help-close" onClick={onClose}>{WEB_HELP.close}</button>
  </div>
  <div className="web-help-body">
   <nav aria-label={WEB_HELP.navLabel} className="web-help-nav" data-testid="web-help-topics">
    {WEB_HELP.groups.map(g=><div key={g.title} className="web-help-group">
     <h3>{g.title}</h3>
     <ul>{g.topics.map(t=><li key={t.id}><button type="button" aria-current={t.id===current?'true':undefined} data-topic={t.id} onClick={()=>open(t.id)}>{t.title}</button></li>)}</ul>
    </div>)}
   </nav>
   <article className="web-help-topic" aria-labelledby={`${id}-h`} data-testid="web-help-topic" data-topic={topic.id}>
    <h3 id={`${id}-h`} ref={heading} tabIndex={-1}>{topic.title}</h3>
    {topic.blocks.map((b,i)=><Block key={i} block={b}/>)}
    {topic.related.length>0&&<p className="web-help-related"><span>{WEB_HELP.related}</span>
     {topic.related.map(r=><button key={r} type="button" className="text-button" onClick={()=>open(r)}>{webHelpTopic(r).title}</button>)}</p>}
   </article>
  </div>
 </dialog>,document.body);
}
