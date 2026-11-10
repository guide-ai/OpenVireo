import {useCallback,useId,useRef,useState,type KeyboardEvent} from 'react';
import {t} from '../i18n';
import {APP_SHELL_MESSAGES as SHELL} from './AppShellMessages';
import {useMenuDismiss} from './useMenuDismiss';
import '../observatory/field-info.css';

/** Front HEADER [W] (user decision, 2026-11-10): the investigation backup in the page bar. Save investigation stays one visible
 * click; Restore investigation JSON and "What a backup includes" sit in the More menu beside it (the Help menu's disclosure
 * pattern: Escape closes it and returns to More, a press or a focus outside closes it). The file input is hidden: the menu item
 * opens its picker from the same click (user activation kept), and focus stays on More when the picker closes. Behaviour is the
 * old card's: the same Save, Restore and Cancel, Save and Restore disabled and Cancel shown while an operation runs.
 * Kept hooks: `.sky-actions` with Save as its first button, Save's text exactly `project.save` (its icon has no text),
 * `#project-file` and its label, and `project.title` as the group's (visually hidden) name. */
export default function InvestigationActions({busy,onSave,onRestore,onCancel}:{busy:boolean;onSave:()=>void;onRestore:(file:File)=>void;onCancel:()=>void}){
 const [open,setOpen]=useState(false),panel=useId();
 const menu=useRef<HTMLDivElement>(null),more=useRef<HTMLButtonElement>(null),file=useRef<HTMLInputElement>(null);
 const close=useCallback(()=>setOpen(false),[]);
 useMenuDismiss(menu,open,close);
 function escape(e:KeyboardEvent){if(e.key!=='Escape'||!open)return;e.preventDefault();e.stopPropagation();setOpen(false);more.current?.focus();}
 function restore(){setOpen(false);more.current?.focus();file.current?.click();}
 return <div className="sky-actions investigation-actions" role="group" aria-labelledby="project-toolbar-title" data-testid="investigation-actions">
  <span id="project-toolbar-title" className="visually-hidden">{t('project.title')}</span>
  <button type="button" className="secondary-button investigation-save" data-testid="investigation-save" disabled={busy} onClick={onSave}>
   <svg className="page-bar-icon" viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false"><path d="M10 3v9M6 8l4 4 4-4M4 16h12"/></svg>{t('project.save')}</button>
  <div className="fi-menu investigation-menu" ref={menu} onKeyDown={escape}>
   <button type="button" ref={more} className="secondary-button investigation-more" aria-label={SHELL.pageBar.moreName} aria-expanded={open} aria-controls={panel} data-testid="investigation-more" onClick={()=>setOpen(o=>!o)}>
    <span className="page-bar-more-text">{SHELL.pageBar.more}</span>
    <svg className="page-bar-chevron" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false"><path d="M3 4.5l3 3 3-3"/></svg></button>
   {open&&<div id={panel} role="group" aria-label={SHELL.pageBar.moreName} className="fi-menu-list" data-testid="investigation-menu">
    <button type="button" data-testid="investigation-restore" disabled={busy} onClick={restore}>{t('project.restore')}</button>
    <details className="toolbar-help" data-testid="investigation-backup-help"><summary>{SHELL.backupHelpSummary}</summary><p>{t('project.toolbarHelp')}</p></details>
   </div>}
  </div>
  {busy&&<button type="button" className="secondary-button" onClick={onCancel}>{t('classLink.cancel')}</button>}
  <input ref={file} id="project-file" type="file" hidden aria-label={t('project.restore')} accept=".json,application/json" disabled={busy}
   onChange={e=>{const chosen=e.target.files?.[0];e.target.value='';if(chosen)onRestore(chosen);}}/>
 </div>;
}
