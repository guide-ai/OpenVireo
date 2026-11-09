import {t,uiLanguage} from '../i18n';
/** Front ES2, F2 (docs/I18N.md): the caption beside a native view whose lines are the bytes a Save writes (or VIREO's own
 * native text). The view stays English (`lang="en"` on it); the caption, in the screen language, says why. English needs none,
 * so the English page is unchanged. `print` words it for a view that is printed rather than saved. */
export default function NativeMirrorCaption({testId,print=false}:{testId?:string;print?:boolean}){
 if(uiLanguage()==='en')return null;
 return <p className="fi-note native-mirror-caption" data-testid={testId}>{t(print?'nativeMirror.captionPrint':'nativeMirror.caption')}</p>;
}
