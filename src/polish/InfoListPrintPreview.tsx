import WebPrintPreview from './WebPrintPreview';
import {infoListPrintPage,infoListPrintText} from '../core/infoListPrint';
import {POLISH_MESSAGES as PM} from './PolishMessages';

/** Front R4b: List › Print... of a TInfoListForm1 window (Print1Click 0x59e4c0, page src/core/infoListPrint.ts) as a browser
 * print preview: the native header, the caption and the lines, in Courier [W: no printer metrics; x 50 is an indent]. */
export default function InfoListPrintPreview({testId,caption,lines,onClose}:{testId:string;caption:string;lines:readonly string[];onClose:()=>void}){
 return <WebPrintPreview testId={testId} caption={caption} note={PM.infoListPrint.note} onClose={onClose}
  nativeHeader={dateText=>infoListPrintText(infoListPrintPage({dateText,caption,lines}))}/>;
}
