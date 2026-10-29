import QuestionBox from './QuestionBox';
import {TERMINATE_SLEW_LITERALS as L,POLISH_MESSAGES as PM} from './PolishMessages';

/** OB-SC-02 (0x5393f2..0x5394f8): MB_YESNO|MB_ICONQUESTION "Terminate Current Slew?" / "Slew Suspended". Yes (6) ends the
 * slew; No resumes it. The coordinates dialog is not opened in either case. */
export default function TerminateSlewBox({onYes,onNo}:{onYes:()=>void;onNo:()=>void}){
 return <QuestionBox caption={L.caption} text={L.text} note={PM.terminateSlew.note} testId="terminate-slew-box" onAnswer={yes=>yes?onYes():onNo()}/>;
}
