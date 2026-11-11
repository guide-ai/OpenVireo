import type {HELP_VIEWER_EN} from '../../../help/HelpViewerMessages';
import type {Translation} from '../../maps';
/** Front FR-HELP: French (fr) for the help viewer's language switch and the Spectral Line Table window. A web adaptation by
 * OpenVireo, not CLEA's (VIREO's missing-file box is spectralLines.ts SPECTRAL_LINE_MISSING_LITERALS, through vireo()). */
export const HELP_VIEWER_FR:Translation<typeof HELP_VIEWER_EN>=Object.freeze({
 translationLabel:'Traduction : adaptation web d’OpenVireo (ce n’est pas un texte du CLEA)',
 originalLabel:'Original : le texte anglais exact de VIREO',
 viewOriginal:'Voir l’original (anglais)',
 viewTranslation:'Voir la traduction',
 translationError:'L’aide traduite n’a pas pu être chargée, ou ne correspondait pas au fichier original dont elle est traduite ; l’aide originale de VIREO, en anglais, est donc affichée.',
 helpAdaptationTranslation:(list:string)=>`La traduction française, par OpenVireo, de l’aide de VIREO lui-même (son index ${list} et les fichiers texte qu’il désigne ; une adaptation web, ce n’est pas un texte du CLEA), affichée dans une version web de la visionneuse d’aide de VIREO. Les tailles de fenêtre, les polices et le bip du système ne sont pas reproduits.`,
 linkNoteTranslation:'Double-cliquez sur un titre placé sous la ligne « Rubriques connexes » traduite, ou appuyez sur Entrée, pour l’ouvrir. Une ligne vide à cet endroit ne fait rien ici ; VIREO s’arrête sur une erreur.',
 searchFoldNote:'Dans la traduction, la recherche ignore les accents et la casse, lit l’apostrophe typographique comme une apostrophe droite, œ et æ comme oe et ae, et l’espace fine comme une espace : c’est une adaptation web. La recherche de VIREO lui-même, conservée dans la vue originale, ignore seulement la casse de A à Z.',
 spectralLines:Object.freeze({
  listCaption:'Raies spectrales',
  rows:'Raies spectrales',helpRows:'Texte d’aide de la raie spectrale',close:'Fermer',
  loading:'Chargement de la liste des raies spectrales de VIREO…',
  error:'Les fichiers de raies spectrales de VIREO (SPECLNS.LNL, SPECLNS.TXT) n’ont pas pu être chargés, ou ne correspondaient pas à leur taille et à leur SHA-256 enregistrés.',
  retry:'Réessayer',ok:'OK',
  note:'La liste des raies spectrales de VIREO (SPECLNS.LNL). Double-cliquez sur une raie, ou appuyez sur Entrée, pour lire son aide dans SPECLNS.TXT. Comme dans VIREO, l’aide est trouvée par le nom de la raie : certaines raies (par exemple les dernières raies de He I) affichent donc la section de la première raie de ce nom. Un simple clic (ou une touche fléchée) place le curseur de classification sur la raie, à la colonne de pixels la plus proche de l’affichage ; la liste sélectionne alors la raie la plus proche de cette colonne, comme le fait VIREO (ainsi, Fe I 4143.878 sélectionne He I 4143.76 dans la vue complète). Les touches fléchées suivent la même règle : la flèche vers le bas ne peut donc pas passer de He I 4143.76 à Fe I 4143.88 ; utilisez Fin ou Origine, ou cliquez sur une raie plus loin, pour la dépasser.',
  cursorAt:(wl:string)=>`Curseur @ : ${wl} Å (VIREO affiche la longueur d’onde de la colonne de pixels du curseur, non celle de la raie elle-même).`,
  cursorOutside:'La raie se trouve hors de la plage affichée : aucun curseur n’est donc tracé (dans VIREO, les lectures du curseur sont effacées, ou pointent au-delà du bord droit).',
  textErrorCaption:'Erreur de fichier d’aide',
  textError:(file:string)=>`Le fichier d’aide des raies spectrales de VIREO (${file}) n’a pas pu être chargé, ou ne correspondait pas à sa taille et à son SHA-256 enregistrés. La liste des raies reste ouverte ; réessayez la raie.`,
 }),
});
