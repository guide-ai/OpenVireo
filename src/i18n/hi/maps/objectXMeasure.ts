import type {OBJECT_X_MEASURE_EN} from '../../../objectx/ObjectXMessages';
import type {Translation} from '../../maps';
/** Front HI6: Hindi (hi) for the E08 position-measuring tool (blink, centroids, plate solution, motion). A web adaptation by
 * OpenVireo, not CLEA's. Nothing here names or describes a target. */
export const OBJECT_X_MEASURE_HI:Translation<typeof OBJECT_X_MEASURE_EN>=Object.freeze({
 title:'स्थितियों का माप लें',
 intro:'यह देखने के लिए कि क्या हिला, दो चित्रों की ब्लिंक तुलना करें, फिर किसी स्रोत पर क्लिक करके उसका माप लें। खगोलमितीय हल के लिए किसी चित्र पर कैटलॉग निर्देशांक वाले कम से कम तीन संदर्भ तारों को चिह्नित करें, या उसके हेडर में लिखे चित्र-निर्देशांक इस्तेमाल करें।',
 adaptation:'वेब अनुकूलन: मूल प्रोग्राम चित्रों को बाहरी खगोलमिति टूलकिट (CLEA Astrometry Toolkit) को भेजता है। यह टूल उस टूलकिट की उपयोगकर्ता गाइड का पालन करता है (8 पिक्सेल के भीतर सबसे चमकीला पिक्सेल, घन भार, छह प्लेट नियतांक) और उसका पोर्ट नहीं है।',
 frame:(n,label)=>`चित्र ${n}: ${label}`,noFrames:'कोई चित्र लोड नहीं है।',
 blinkStart:'ब्लिंक करें',blinkStop:'ब्लिंक बंद करें',blinkInterval:'ब्लिंक अंतराल (ms)',showFrame:'चित्र दिखाएँ',
 roleTarget:'लक्ष्य',roleReference:'संदर्भ तारा',roleLegend:'अगला चिह्न',
 refRa:'कैटलॉग RA (h m s)',refDec:'कैटलॉग Dec (° ′ ″)',refInvalid:'संदर्भ तारे का RA h m s में और Dec ° ′ ″ में लिखें।',
 cursor:(x,y)=>`कर्सर x ${x}, y ${y}`,measure:'कर्सर पर माप लें',viewport:'चित्र; तीर कुंजियाँ कर्सर हिलाती हैं, Enter माप लेती है',
 keyboardHelp:'तीर कुंजियाँ कर्सर को एक पिक्सेल हिलाती हैं (Shift के साथ दस)। Enter या Spacebar माप लेती है।',
 rangeLow:'निचली सीमा',rangeHigh:'ऊपरी सीमा',
 rangeNote:'ये सीमाएँ डिस्प्ले स्ट्रेच और केंद्रक के भार, दोनों तय करती हैं (वेब डिफ़ॉल्ट: निचली सीमा आकाश के स्तर पर, यानी चित्र की माध्यिका पर; ऊपरी सीमा चित्र के परास के 50% पर)। अगर “कर्सर पर माप लें” को निचली सीमा से ऊपर कोई स्रोत न मिले, तो निचली सीमा घटाएँ या लंबा एक्सपोज़र लें।',
 blinkAligned:'ब्लिंक हर चित्र के पहले दो संदर्भ तारों पर संरेखित है।',
 blinkRaw:'कच्चे फ़्रेम ब्लिंक हो रहे हैं (एक ही दिशा मानी गई है); उन्हें संरेखित करने के लिए हर चित्र पर दो संदर्भ तारे चिह्नित करें।',
 plateTitle:'खगोलमितीय हल',plateFrame:(n,refs)=>`चित्र ${n}: ${refs} संदर्भ तारे`,plateNone:(n,refs)=>`चित्र ${n}: ${refs} संदर्भ तारे (कम से कम 3 चाहिए)`,
 plateDegenerate:n=>`चित्र ${n}: संदर्भ तारे लगभग एक सीधी रेखा में हैं।`,plateRms:(rms,scale)=>`rms ${rms}″, पैमाना ${scale}″/पिक्सेल`,colResidual:'अवशिष्ट (″)',
 table:'माप',colFrame:'चित्र',colRole:'चिह्न',colX:'x',colY:'y',colRa:'RA',colDec:'Dec',colUt:'UT',colMethod:'हल',remove:'हटाएँ',
 notSolved:'हल नहीं हुआ',methodPlate:'प्लेट नियतांक',methodWcs:'हेडर WCS',
 motion:(rate,pa,arcsec,hours)=>`गति: ${rate}″/h, स्थिति कोण ${pa}° की ओर (${hours} h में ${arcsec}″ का विस्थापन)।`,
 motionNone:'लक्ष्य की गति पाने के लिए अलग-अलग समय पर लिए गए दो चित्रों पर उसका माप लें।',
 errors:Object.freeze({bounds:'कर्सर चित्र के बाहर है।',range:'निचली सीमा ऊपरी सीमा से कम होनी चाहिए।','no-signal':'कर्सर के पास निचली सीमा से ऊपर कोई स्रोत नहीं है।',references:'बहुत ज़्यादा चिह्न हैं; पहले कुछ हटाएँ।',degenerate:'संदर्भ तारे लगभग एक सीधी रेखा में हैं; दूसरे चुनें।',wcs:'इस चित्र में उपयोग लायक निर्देशांक हेडर नहीं है।',time:'दोनों चित्रों का समय एक ही है।'}),
});
