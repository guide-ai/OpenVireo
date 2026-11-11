import type {FIELD_READ_DETAILS_EN} from '../../../observatory/FieldInfoMessages';
import type {Translation} from '../../maps';
/** Front FR1: French (fr) for the readable details of the catalogue tile and field read results. A web adaptation by OpenVireo, not CLEA's. */
export const FIELD_READ_DETAILS_FR:Translation<typeof FIELD_READ_DETAILS_EN>=Object.freeze({
 'field-tiles':Object.freeze({
  fetch:'un fragment du catalogue n’est pas arrivé',
  integrity:'un fragment du catalogue ne correspondait pas à sa taille et à son SHA-256 enregistrés',
  index:'l’index du catalogue n’a pas pu être lu ou ne correspondait pas à ce site',
  budget:'ce champ nécessite plus de fragments du catalogue à la fois que ce site n’en garde en mémoire',
  'missing-tile':'ce site a demandé le mauvais fragment du catalogue (merci de le signaler)',
 } as Record<string,string>),
 'field-unreadable':Object.freeze({
  'band-end':'dans VIREO, ce champ lit au-delà de la fin d’une bande de déclinaison de son catalogue, ce qui déclenche une erreur d’entrée/sortie et laisse une liste d’étoiles partielle. Ce site n’affiche aucun champ à la place [adaptation web].',
  regions:'VIREO afficherait un avertissement « Le champ contient trop de régions ! » et garderait les 100 premières régions ; ce site ne le reproduit pas [adaptation web].',
  budget:'le champ contient plus d’enregistrements du catalogue que ce site n’en lit dans une bande de déclinaison [limite web].',
  plan:'ce site a lu en dehors des fragments du catalogue qu’il avait prévus (merci de le signaler).',
  source:'un fichier de catalogue inclus n’a pas la forme attendue (merci de le signaler).',
  input:'ce pointage n’est pas une position valide du ciel.',
  evidence:'le moteur de champ a trouvé ses enregistrements incohérents (merci de le signaler).',
 } as Record<string,string>),
});
