import type {FIELD_READ_DETAILS_EN} from '../../../observatory/FieldInfoMessages';
import type {Translation} from '../../maps';
/** Front HI1: Hindi (hi) for the readable details of the catalogue tile and field read results. A web adaptation by OpenVireo, not CLEA's. */
export const FIELD_READ_DETAILS_HI:Translation<typeof FIELD_READ_DETAILS_EN>=Object.freeze({
 'field-tiles':Object.freeze({
  fetch:'कैटलॉग का एक टुकड़ा नहीं पहुँचा',
  integrity:'कैटलॉग का एक टुकड़ा अपने दर्ज आकार और SHA-256 से मेल नहीं खाया',
  index:'कैटलॉग का सूचकांक पढ़ा नहीं जा सका या इस साइट से मेल नहीं खाया',
  budget:'इस क्षेत्र को एक साथ उससे ज़्यादा कैटलॉग टुकड़े चाहिए जितने यह साइट मेमोरी में रखती है',
  'missing-tile':'इस साइट ने कैटलॉग का गलत टुकड़ा माँगा (कृपया इसकी रिपोर्ट करें)',
 }),
 'field-unreadable':Object.freeze({
  'band-end':'VIREO में यह क्षेत्र उसके कैटलॉग की क्रांति पट्टी के अंत से आगे पढ़ता है, जिससे इनपुट/आउटपुट त्रुटि होती है और तारों की सूची अधूरी रह जाती है। यह साइट इसके बजाय कोई क्षेत्र नहीं दिखाती [वेब अनुकूलन]।',
  regions:'VIREO “Field Contains Too Many Regions!” की चेतावनी देता और पहले 100 क्षेत्र रखता; यह साइट इसे नहीं दोहराती [वेब अनुकूलन]।',
  budget:'इस क्षेत्र में कैटलॉग के उससे ज़्यादा रिकॉर्ड हैं जितने यह साइट क्रांति की एक पट्टी में एक बार में पढ़ती है [वेब सीमा]।',
  plan:'इस साइट ने अपनी योजना के कैटलॉग टुकड़ों से बाहर पढ़ा (कृपया इसकी रिपोर्ट करें)।',
  source:'शामिल की गई कैटलॉग फ़ाइल अपेक्षित रूप में नहीं है (कृपया इसकी रिपोर्ट करें)।',
  input:'दूरबीन की यह दिशा आकाश की मान्य स्थिति नहीं है।',
  evidence:'क्षेत्र इंजन को अपने रिकॉर्ड आपस में मेल खाते नहीं मिले (कृपया इसकी रिपोर्ट करें)।',
 }),
});
