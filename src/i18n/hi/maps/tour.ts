import type {TOUR_EN} from '../../../help/tour';
import type {Translation} from '../../maps';
/** Front HI0: Hindi (hi) for the first-visit tour. A web adaptation by OpenVireo, not CLEA's. */
export const TOUR_HI:Translation<typeof TOUR_EN>=Object.freeze({
 label:'OpenVireo का परिचय टूर',
 progress:(n:number,of:number)=>`चरण ${n} / ${of}`,
 next:'आगे',back:'पीछे',skip:'टूर छोड़ें',done:'खोजबीन शुरू करें',
 firstLook:'पहली नज़र डालें (लगभग 3 मिनट)',chooseLab:'कोई प्रयोग चुनें',
 steps:Object.freeze({
  welcome:Object.freeze({title:'OpenVireo में आपका स्वागत है',
   text:'OpenVireo खगोल विज्ञान के प्रयोगों के लिए एक आभासी वेधशाला है, जिसे Project CLEA के VIREO से ब्राउज़र में दोबारा बनाया गया है। यह छोटा टूर दिखाता है कि चीज़ें कहाँ हैं। इसमें एक मिनट से भी कम लगता है।'}),
  save:Object.freeze({title:'अपना काम फ़ाइल के रूप में सहेजें',
   text:'आपका काम तब तक इसी ब्राउज़र टैब में रहता है जब तक आप उसे सहेज न लें। हर पेज के ऊपर “जाँच सहेजें” एक फ़ाइल डाउनलोड करता है; उसके बगल के मेनू में “जाँच पुनर्स्थापित करें (JSON)” उसे बाद में फिर से लोड करता है।'}),
  help:Object.freeze({title:'सहायता हमेशा मौजूद है',
   text:'सहायता विषयों के लिए सहायता खोलें, या टेक्स्ट फ़ील्ड के बाहर कहीं भी ? कुंजी दबाएँ। आप यह टूर सहायता मेनू से दोबारा ले सकते हैं।'}),
  start:Object.freeze({title:'आप कैसे शुरू करना चाहेंगे?',
   text:'तीन मिनट में आकाश पर पहली नज़र डालें, या सात प्रयोगों में से कोई एक चुनें; हर प्रयोग का एक गाइड है, जो आपके साथ रहता है। हर पेज मेनू में है; फ़ोन पर यह मेनू बटन के पीछे है।'}),
 }),
});
