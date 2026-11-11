import type {OBSERVATION_METADATA_EN} from '../../../ObservationMetadataMessages';
import type {Translation} from '../../maps';
/** Front FR1: French (fr) for the Observational Data values of loaded and acquired spectra. A web adaptation by OpenVireo, not CLEA's. */
export const OBSERVATION_METADATA_FR:Translation<typeof OBSERVATION_METADATA_EN>=Object.freeze({
 empty:'(vide)',
 note:'Comme dans VIREO, un spectre chargé depuis un fichier prend son identifiant d’objet dans le nom du fichier, son heure dans la dernière modification du fichier (convertie ici en JD en UTC) et sa position dans le pointage du télescope inscrit dans l’en-tête du fichier ; la photométrie et le décalage vers le rouge restent vides, et une case vide signifie que la valeur n’est pas connue. Un spectre classé directement à partir d’une pose n’a pas d’heure de fichier ; son JD reste donc vide.',
 row:(jd:string,ra:string,dec:string)=>`JD ${jd||'—'} · AD ${ra||'—'} · Déc. ${dec||'—'}`,
});
