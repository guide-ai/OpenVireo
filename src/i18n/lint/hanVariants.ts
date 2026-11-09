/** Front SC4 (plan front-i18n-scripts.md §6 "Script purity"): characters that mark a Chinese string as written in the other
 * script. SEED TABLE, hand-curated for the words an astronomy lab interface uses (observatory, telescope, spectrum, file,
 * window, settings…): each pair is a Simplified character that standard Traditional text never uses and its Traditional
 * form, which standard Simplified text never uses. One-to-many and shared characters (发 發/髮, 复 復/複, 台 臺/檯/颱, 后,
 * 里, 只, 干, 面, 系…) are left out on purpose, so a hit is always a real mix-up.
 *
 * The plan asks for a table generated from Unicode's Unihan kSimplifiedVariant/kTraditionalVariant with its version recorded.
 * No Unihan data is in the repository or on this machine, and fetching it is a new download source, so generation waits for
 * the coordinator (it belongs with zh-Hans's XX0, which also calibrates this lint). Japanese is not checked against this
 * table: shinjitai share many simplified shapes (写, 数, 体, 号, 学, 点, 黄…). */
const PAIRS='开開关關观觀测測镜鏡谱譜数數设設选選择擇载載图圖视視时時间間远遠动動线線频頻读讀写寫输輸键鍵删刪误誤错錯帮幫页頁单單项項显顯请請确確认認闭閉统統类類级級无無变變圆圓顶頂银銀气氣过過这這们們个個为為对對话話说說现現实實验驗习習课課学學计計质質长長极極红紅蓝藍绿綠黄黃仪儀档檔储儲览覽击擊';
const simplified:string[]=[],traditional:string[]=[];
for(let i=0;i<PAIRS.length;i+=2){simplified.push(PAIRS[i]);traditional.push(PAIRS[i+1]);}
/** Simplified-only characters (a zh-Hant string must not contain them), with their Traditional forms. */
export const SIMPLIFIED_ONLY:ReadonlyMap<string,string>=new Map(simplified.map((s,i)=>[s,traditional[i]]));
/** Traditional-only characters (a zh-Hans string must not contain them), with their Simplified forms. */
export const TRADITIONAL_ONLY:ReadonlyMap<string,string>=new Map(traditional.map((t,i)=>[t,simplified[i]]));
