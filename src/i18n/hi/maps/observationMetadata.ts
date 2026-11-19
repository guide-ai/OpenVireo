import type {OBSERVATION_METADATA_EN} from '../../../ObservationMetadataMessages';
import type {Translation} from '../../maps';
/** Front HI1: Hindi (hi) for the Observational Data values of loaded and acquired spectra. A web adaptation by OpenVireo, not CLEA's. */
export const OBSERVATION_METADATA_HI:Translation<typeof OBSERVATION_METADATA_EN>=Object.freeze({
 empty:'(खाली)',
 note:'VIREO की तरह, फ़ाइल से लोड किया गया स्पेक्ट्रम अपना वस्तु ID फ़ाइल के नाम से, अपना समय फ़ाइल के आखिरी बदलाव से (यहाँ UTC में JD में बदला गया), और अपनी स्थिति फ़ाइल के हेडर में लिखी दूरबीन की दिशा से लेता है; फ़ोटोमेट्री और अभिरक्त विस्थापन खाली रहते हैं, और खाली बॉक्स का मतलब है कि मान ज्ञात नहीं है। किसी एक्सपोज़र से सीधे वर्गीकृत किए गए स्पेक्ट्रम का कोई फ़ाइल-समय नहीं होता, इसलिए उसका JD खाली रहता है।',
 row:(jd:string,ra:string,dec:string)=>`JD ${jd||'—'} · RA ${ra||'—'} · Dec ${dec||'—'}`,
});
