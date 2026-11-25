/** Front NEWCOMER NC3 [W] (plan analysis/front-plans/front-newcomer.md §2.3, review M7): a guide window printed while it is open
 * prints everything it says, folded or not. `beforeprint` opens every closed `<details>` of an open guide window (its steps'
 * More detail, Research notes, What does this progress mean?, Troubleshooting, Sources), and `afterprint` closes exactly those
 * again, so what the visitor had opened or closed is as it was. Nothing is stored. DOM only; no React. */
export const GUIDE_PRINT_DETAILS='dialog.hubble-lab-dialog[open] details:not([open])';

/** Opens the closed `<details>` of the open guide windows under `root`; the returned function closes those of them still open. */
export function openGuideDetailsForPrint(root:ParentNode):()=>void{
 const opened=[...root.querySelectorAll<HTMLDetailsElement>(GUIDE_PRINT_DETAILS)];
 for(const d of opened)d.open=true;
 return ()=>{for(const d of opened)if(d.isConnected&&d.open)d.open=false;};
}

/** Listens for print on `win` for as long as the shell is mounted; returns the removal. */
export function installGuidePrintDetails(win:Window=window):()=>void{
 let restore:(()=>void)|null=null;
 const before=()=>{restore?.();restore=openGuideDetailsForPrint(win.document);};
 const after=()=>{restore?.();restore=null;};
 win.addEventListener('beforeprint',before);win.addEventListener('afterprint',after);
 return ()=>{restore?.();restore=null;win.removeEventListener('beforeprint',before);win.removeEventListener('afterprint',after);};
}
