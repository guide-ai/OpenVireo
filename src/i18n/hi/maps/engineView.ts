import type {ENGINE_VIEW_EN} from '../../../SpectrumEngineMessages';
import type {Translation} from '../../maps';
/** Front HI2: Hindi (hi) for the measuring engine’s web strings (zoom window, pan and readout). A web adaptation by OpenVireo, not CLEA’s. */
export const ENGINE_VIEW_HI:Translation<typeof ENGINE_VIEW_EN>=Object.freeze({
 panLeft:'विंडो को 100 Å बाईं ओर खिसकाएँ',
 panRight:'विंडो को 100 Å दाईं ओर खिसकाएँ',
 readoutEmpty:'तरंगदैर्घ्य पढ़ने के लिए प्लॉट में खींचें, या उस पर फ़ोकस करके तीर कुंजियों का उपयोग करें।',
 nearest:'निकटतम तुलना रेखा',
 nearestNone:'कर्सर से 100 Å के भीतर कोई तुलना रेखा नहीं है।',
 nearestFound:(label:string,shifted:string)=>`निकटतम तुलना रेखा: ${label}, ${shifted} Å पर।`,
 plotHelp:'स्पेक्ट्रम प्लॉट। कर्सर को हिलाने के लिए खींचें, या तीर कुंजियों का उपयोग करें; निकटतम तुलना रेखा के लिए राइट-क्लिक करें या N दबाएँ।',
 window:(min:string,max:string)=>`विंडो ${min}–${max} Å`,
 fullViewNote:'पूर्ण दृश्य और H/K दृश्य वेब प्रीसेट हैं; ज़ूम और तीर सामान्य दृश्य पर लागू होते हैं।',
 note:'VIREO की तरह, ज़ूम लोड किए गए स्पेक्ट्रम की शुरुआत से 100 Å के चरणों में एक विंडो चुनता है और पहले z नियंत्रण को उसके आधार में जोड़ लेता है (जैसे “फिर से केंद्रित करें” करता है); तीर विंडो को 100 Å खिसकाते हैं और उसके सिरों से 100 Å से कम आगे जा सकते हैं; रीडआउट कर्सर के नीचे का प्रेक्षित तरंगदैर्घ्य और प्लॉट अक्ष पर कर्सर की ऊँचाई दिखाता है, स्पेक्ट्रम का मान नहीं।',
});
