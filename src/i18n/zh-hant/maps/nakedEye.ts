import type {NAKED_EYE_MESSAGES_EN} from '../../../observatory/FieldInfoMessages';
import type {Translation} from '../../maps';
/** Front ZT1: Traditional Chinese (zh-Hant, Taiwan) for the naked-eye sky through the open dome (Naked Eye Star), adapted from the reviewed zh-Hans with the English as the source. A web adaptation by OpenVireo, not CLEA's. */
export const NAKED_EYE_ZH_HANT:Translation<typeof NAKED_EYE_MESSAGES_EN>=Object.freeze({
 eyebrow:'VIREO · 圓頂已開啟',title:'肉眼可見的天空',
 help:'透過開啟的圓頂，你用肉眼能看到的亮星（V ≤ 5.5），依VIREO的繪製方式呈現：約31°寬、40°高，以望遠鏡所指方向、地平線之上45°為中心。在一顆星上按一下右鍵（或用方向鍵移動游標後按Enter）即可檢視它的資料。',
 skyLabel:'透過圓頂看到的肉眼可見天空。在一顆星上按一下右鍵，或用方向鍵和Enter，即可開啟「肉眼可見恆星」。',
 loading:'正在載入肉眼可見恆星檔案……',
 fileError:'無法載入肉眼可見恆星檔案（NkdEye.dat），或其與記錄的大小和SHA-256不符。',
 caption:(site:string,utc:string,count:number)=>`${site} · ${utc} UT（圓頂開啟的時刻；關閉後重新開啟圓頂即可重繪）· 視野內共${count}顆星。`,
 adaptation:'網頁改編：星星依VIREO的亮度等級繪製為圓盤，而不是它的星點圖示，圓頂天窗也不繪製。位置、可見區域（包括VIREO的一個怪異之處：朝南時，中線以西一點的許多星會被丟掉）以及按一下右鍵選取，都與原版一致。',
 showAtCursor:'顯示游標處的星',
 tapAdaptation:'針對觸控螢幕的網頁改編：輕點天空移動游標（+），再按「顯示游標處的星」。僅輕點不會開啟該星，因為在VIREO中按一下左鍵什麼也不會發生。',
 magNote:'與VIREO一樣，可以輸入V星等，但不會儲存任何內容。',
});
