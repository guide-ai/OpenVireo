import type{ReactNode}from'react';
import{t}from'../i18n';

/** Folded technical notes (audit item 1.11). Presentation only: the text stays complete in the
 * DOM and one click away; scientific limits and adaptation labels must never be removed. */
export default function ResearchNotes({children,testId}:{children:ReactNode;testId?:string}){
 return <details className="research-notes" data-testid={testId}><summary>{t('notes.summary')}</summary>{children}</details>;
}
