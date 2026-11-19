import type {HELP_MENU_EN} from '../../../help/HelpMessages';
import type {Translation} from '../../maps';
/** Front HI0: Hindi (hi) for OpenVireo's own text in the Help menus. VIREO's menu captions (Help, Topics..., Websites…)
 * are originals (originals.json). A web adaptation by OpenVireo, not CLEA's. */
export const HELP_MENU_HI:Translation<typeof HELP_MENU_EN>=Object.freeze({
 newTab:'(नए टैब में खुलता है)',
 noEquivalent:(original:string)=>`— VIREO यहाँ ${original} खोलता था। वह साइट अब मौजूद नहीं है और कोई समकक्ष पेज भी नहीं है, इसलिए कोई लिंक नहीं दिया गया है।`,
 websitesNote:'VIREO ये पेज ब्राउज़र की नई विंडो में खोलता था। यहाँ ये केवल आपके क्लिक करने पर नए टैब में खुलते हैं, और कुछ भी भेजा नहीं जाता। VIREO के दो पते अब मौजूद नहीं हैं: 2MASS (xena.harvard.edu) IRSA (NASA/IPAC) का मौजूदा 2MASS पेज खोलता है, और NVO (www.us-vo.org) अपने उत्तराधिकारी, NASA की आभासी वेधशालाओं NAVO (NASA Astronomical Virtual Observatories) का पेज खोलता है।',
 reminderLoading:'VIREO का अनुस्मारक लोड हो रहा है…',
 reminderError:'VIREO की अनुस्मारक फ़ाइल (Reminder.obs) लोड नहीं हो सकी, या वह दर्ज किए गए आकार और SHA-256 से मेल नहीं खाई।',
 ok:'ठीक है',cancel:'रद्द करें',close:'बंद करें',yes:'हाँ',no:'नहीं',
 menuName:Object.freeze({main:'वेधशाला का सहायता मेनू',radio:'रेडियो दूरबीन का सहायता मेनू'}),
 radioOff:'VIREO का रेडियो सहायता मेनू (विषय..., इस प्रयोग के बारे में...) रेडियो दूरबीन के नियंत्रण पैनल पर है, जो दूरबीन चालू करने पर खुलता है।',
 reminderErrorQuestion:'तब VIREO इसके बजाय यह पूछता है:',
 exitDone:'आपने प्रयोग पूरा कर लिया है। वेब पेज अपने आप बंद नहीं हो सकता: अपना काम सहेजें, फिर तैयार होने पर यह ब्राउज़र टैब बंद करें।',
 siteAbout:'OpenVireo और गोपनीयता के बारे में',
 webTopics:'सहायता विषय…',
 tour:'साइट का परिचय टूर लें',
 shortcutKey:'?',
 buttonNames:Object.freeze({
  'OBSRVHLP.LST':'दूरबीन नियंत्रणों की सहायता','PHOTOHLP.LST':'फ़ोटोमीटर की सहायता','CAMHLP.LST':'कैमरे की सहायता','SPECHLP.LST':'स्पेक्ट्रोमीटर की सहायता',
  'CLASSHLP.LST':'स्पेक्ट्रमी वर्गीकरण की सहायता','MEASHLP.LST':'स्पेक्ट्रम माप की सहायता','HRANALHLP.LST':'H-R आरेख की सहायता','VARTYPEHLP.LST':'परिवर्ती तारों के प्रकारों की सहायता',
  'WDGPLTHLP.LST':'शंकु आरेख की सहायता','PLSANHLP.LST':'पल्सर विश्लेषण की सहायता','PLSLSHLP.LST':'पल्सर पैरामीटर की सहायता','MLTSPHLP.LST':'बहु-वस्तु स्पेक्ट्रोमीटर की सहायता',
  'SPLSTHLP.LST':'बहु-वस्तु स्पेक्ट्रम सूची की सहायता',
 }),
 exitNote:'जब आप किसी प्रयोग के दौरान वेधशाला से बाहर निकलते हैं (प्रयोग चलाएँ [Run Exercise] के बाद), तब VIREO यह अनुस्मारक दिखाता है; वरना वह केवल पूछता है कि बाहर निकलना है या नहीं। OpenVireo में लॉग इन (Log In) या प्रयोग चलाएँ (Run Exercise) का कोई चरण नहीं है, इसलिए वेधशाला हमेशा चालू प्रयोग मानी जाती है। VIREO में ठीक है (OK) या हाँ (Yes) प्रोग्राम बंद कर देता है; रद्द करें (Cancel) या नहीं (No) उसे खुला रखता है।',
});
