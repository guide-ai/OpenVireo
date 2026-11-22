import type {OBJECT_X_MEASURE_EN} from '../../../objectx/ObjectXMessages';
import type {Translation} from '../../maps';
/** Front ZT2: Traditional Chinese (zh-Hant, Taiwan) for the E08 position-measuring tool (blink, centroids, plate solution, motion), adapted from the reviewed zh-Hans with the English as the source. A web adaptation by OpenVireo, not CLEA's; VIREO's own captions are translated through vireo() (originals.json). No string names or describes a particular target. */
export const OBJECT_X_MEASURE_ZH_HANT:Translation<typeof OBJECT_X_MEASURE_EN>=Object.freeze({
 title:'測量位置',
 intro:'對兩張影像進行閃視比較，找出移動的天體，再按一下光源進行測量。要得到天體測量解，可在一張影像上標記至少三顆帶有星表座標的參考星，也可以使用影像標頭中寫明的影像座標。',
 adaptation:'網頁改編：原版會把影像傳送到外部的CLEA天體測量工具包（Astrometry Toolkit）。本工具遵循該工具包的使用者指南（8個像素內最亮的像素、立方權重、六個底片常數），並不是它的移植。',
 frame:(n,label)=>`影像${n}：${label}`,noFrames:'尚未載入影像。',
 blinkStart:'開始閃視',blinkStop:'停止閃視',blinkInterval:'閃視間隔（ms）',showFrame:'顯示影像',
 roleTarget:'目標',roleReference:'參考星',roleLegend:'下一個標記是',
 refRa:'星表赤經（時 分 秒）',refDec:'星表赤緯（° ′ ″）',refInvalid:'請依時 分 秒輸入參考星的赤經，依° ′ ″輸入赤緯。',
 cursor:(x,y)=>`游標x ${x}，y ${y}`,measure:'在游標處測量',viewport:'影像；方向鍵移動游標，Enter鍵進行測量',
 keyboardHelp:'方向鍵每次將游標移動一個像素（按住Shift鍵：十個像素）。按Enter鍵或空白鍵進行測量。',
 rangeLow:'下限截值',rangeHigh:'上限截值',
 rangeNote:'截值同時決定顯示拉伸和質心權重（網頁預設：下限取天空背景水準，即影像中位數；上限取影像範圍的50%）。如果「在游標處測量」在下限截值以上找不到光源，請降低下限截值，或延長曝光時間。',
 blinkAligned:'已依每張影像的前兩顆參考星對齊後閃視。',
 blinkRaw:'正在閃視原始影像（假定指向相同）；要對齊它們，請在每張影像上標記兩顆參考星。',
 plateTitle:'天體測量解',plateFrame:(n,refs)=>`影像${n}：${refs}顆參考星`,plateNone:(n,refs)=>`影像${n}：${refs}顆參考星（至少需要3顆）`,
 plateDegenerate:n=>`影像${n}：這些參考星幾乎在一條直線上。`,plateRms:(rms,scale)=>`rms ${rms}″，比例尺${scale}″/像素`,colResidual:'殘差（″）',
 table:'測量',colFrame:'影像',colRole:'標記',colX:'x',colY:'y',colRa:'赤經',colDec:'赤緯',colUt:'UT',colMethod:'解',remove:'移除',
 notSolved:'未求解',methodPlate:'底片常數',methodWcs:'影像標頭WCS',
 motion:(rate,pa,arcsec,hours)=>`運動：朝位置角${pa}°方向，速率${rate}″/h（${hours} h內移動${arcsec}″）。`,
 motionNone:'在不同時間拍攝的兩張影像上測量目標，即可得到它的運動。',
 errors:Object.freeze({bounds:'游標在影像之外。',range:'下限截值必須低於上限截值。','no-signal':'游標附近沒有高於下限截值的光源。',references:'標記過多；請先移除一些。',degenerate:'這些參考星幾乎在一條直線上；請選擇其他參考星。',wcs:'這張影像沒有可用的座標標頭。',time:'兩張影像的時間相同。'}),
});
