import type {LANGUAGE_CHOICE_EN} from '../../../components/LanguageChoiceMessages';
import type {Translation} from '../../maps';
/** Front HI0: Hindi (hi) for the language selector and its reload dialog. The option names are the autonyms of src/i18n/languages.json. A web adaptation by OpenVireo, not CLEA's. */
export const LANGUAGE_CHOICE_HI:Translation<typeof LANGUAGE_CHOICE_EN>=Object.freeze({
 legend:'भाषा / Language',
 title:'भाषा बदलें?',
 reload:(language:string)=>`पेज ${language} में फिर से लोड होगा, और आप साइट के इसी पेज पर रहेंगे।`,
 lost:'जो काम केवल स्क्रीन पर है, वह खो जाएगा: दूरबीन की मौजूदा स्थिति, चल रहे एक्सपोज़र, माप, खुली विंडो, प्रशिक्षक मोड और वह सब कुछ जो आपने फ़ाइल में नहीं सहेजा है।',
 kept:'आपने अपने कंप्यूटर पर जो फ़ाइलें सहेजी हैं, उन पर कोई असर नहीं पड़ेगा; “जाँच पुनर्स्थापित करें (JSON)” से कोई जाँच फिर से लोड की जा सकती है। यह ब्राउज़र आपके पुष्ट प्रेक्षण परिणाम और आपकी डिस्प्ले पसंद भी सँभालकर रखता है।',
 save:'जाँच सहेजें',
 saveNote:'“जाँच सहेजें” पहले आपके मौजूदा काम की एक फ़ाइल डाउनलोड करता है। उसके बाद भाषा बदलें।',
 change:'बदलें और रीलोड करें',
 cancel:'रद्द करें',
 preview:'रिलीज़ से पहले का पूर्वावलोकन: भाषा पते (?lang=) से चुनी जाती है और सहेजी नहीं जाती।',
 notRemembered:'यह ब्राउज़र OpenVireo को आपकी पसंद याद रखने नहीं देता, इसलिए यह केवल इसी पेज लोड पर लागू होता है।',
 originals:'VIREO के अपने पाठ अंग्रेज़ी में दिखाएँ',
 originalsNote:'VIREO के मेनू, विंडो और संदेशों के पाठ अंग्रेज़ी में दिखते हैं, ठीक वैसे जैसे VIREO उन्हें लिखता है। OpenVireo के अपने पाठ चुनी हुई भाषा में ही रहते हैं। यह अगली बार पेज लोड होने पर लागू होता है।',
 originalsNotStored:'यह ब्राउज़र OpenVireo को यह विकल्प याद रखने नहीं देता।',
});
