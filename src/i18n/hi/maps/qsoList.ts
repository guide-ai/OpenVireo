import {HST_ARCHIVE} from '../../../core/observatoryMenuLiterals';
import type {QSO_LIST_MESSAGES_EN} from '../../../observatory/QsoListMessages';
import type {Translation} from '../../maps';
/** Front HI1: Hindi (hi) for the QSO List and the HST Image Archive item. A web adaptation by OpenVireo, not CLEA's. */
export const QSO_LIST_HI:Translation<typeof QSO_LIST_MESSAGES_EN>=Object.freeze({
 virtualObservatoryLabel:'आभासी वेधशाला (प्रशिक्षक, VIREO)',
 virtualObservatoryAdaptation:'वेब अनुकूलन: VIREO में यह प्रशिक्षक विकल्प, जो डिफ़ॉल्ट रूप से बंद रहता है, प्रयोग चलाएँ (Run Exercise) › आभासी वेधशाला (Virtual Observatory) (सभी उपकरण) को चालू करता है, यानी वह मोड जिसमें विद्यार्थियों को फ़ाइल › QSO सूची मिलती है। यहाँ यह केवल प्रशिक्षक मोड में खुलता है (प्रदर्शन मोड, Demonstration Mode, का वेब रूप, बिना पासवर्ड के); यह डिफ़ॉल्ट रूप से बंद रहता है, पेज इसे सहेजता नहीं है (केवल “अपडेट सहेजें” इसे आपकी रखी हुई विकल्प फ़ाइल में लिखता है), “बाहर निकलें” इसे बंद कर देता है, और इसका एकमात्र असर फ़ाइल › QSO सूची को दिखाना है।',
 sortDisabled:'VIREO की तरह, “क्रमबद्ध करने के विकल्प” केवल संपादन मोड (Edit Mode) में उपलब्ध है; उसके बिना सूची कांतिमान के अनुसार क्रमबद्ध रहती है।',
 limitLabel:'कांतिमान सीमा, V',
 withheld:'ऑब्जेक्ट X के लक्ष्यों के पास की पंक्तियाँ सूचीबद्ध नहीं की जातीं, ताकि सूची यह न बता दे कि ऑब्जेक्ट X का कोई अप्रकट लक्ष्य क्या है (वेब नियम; VIREO यह सूची केवल अपने आभासी वेधशाला मोड में, या ऑब्जेक्ट X के दौरान संपादन मोड में दिखाता है)।',
 editModeColumns:'संपादन मोड (Edit Mode) के कॉलम: z कैटलॉग का अभिरक्त विस्थापन है; कोष्ठक में B−V और U−B तय किए गए औसत रंग हैं। इस सूची में प्रयोग का कोई लक्ष्य नहीं है।',
 noActivate:'VIREO की तरह, किसी पंक्ति पर डबल-क्लिक करने से कुछ नहीं होता; QSO को वस्तु सूची में जोड़ने के लिए “चयन” इस्तेमाल करें।',
 csvDisabled:'VIREO में इस सूची के लिए “अल्पविराम से अलग करें” बंद है।',
 modeless:'आपके प्रेक्षण करते समय सूची खुली रहती है; सीमा या क्रम बदलने के लिए फ़ाइल › QSO सूची फिर से चुनें।',
 printStudent:'वेब अनुकूलन: संपादन मोड के बिना VIREO तारीख के नीचे प्रयोगशाला की मेज़ संख्या और विद्यार्थियों के नाम प्रिंट करता है; यह साइट इनमें से कुछ दर्ज नहीं करती, इसलिए VIREO का “(Not Recorded)” प्रिंट करती है और कोई नाम नहीं।',
 fileError:(reason:string)=>`वेब अनुकूलन: शामिल की गई प्रति ${reason}।`,
 fileReasons:Object.freeze({download:'डाउनलोड नहीं हो सकी',size:'अपने दर्ज आकार की नहीं है',sha256:'अपने दर्ज SHA-256 से मेल नहीं खाती'}),
 objectXUnavailable:'QSO सूची नहीं दिखाई जा सकती: ऑब्जेक्ट X के लक्ष्यों की स्थितियाँ लोड नहीं हो सकीं, और उनके बिना सूची किसी अप्रकट लक्ष्य को प्रकट कर सकती है।',
 loading:'QSO कैटलॉग लोड हो रहा है…',
 noSelection:'पहले QSO की कोई पंक्ति चुनें।',
 hst:Object.freeze({
  newTab:'(बाहरी साइट, नए टैब में खुलती है)',
  note:`वेब अनुकूलन: VIREO ने ${HST_ARCHIVE.defaultUrl} (फ़ाइल विकल्पों का “${HST_ARCHIVE.optionsLabel}”) को ब्राउज़र विंडो में खोला था। वह पेज अब मौजूद नहीं है; यह लिंक hubblesite.org पर उसका मौजूदा समकक्ष खोलता है, जिसे NASA अब अपनी Hubble Images गैलरी के रूप में चलाता है। इसके साथ कुछ नहीं भेजा जाता।`,
 }),
});
