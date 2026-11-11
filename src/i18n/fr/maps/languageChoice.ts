import type {LANGUAGE_CHOICE_EN} from '../../../components/LanguageChoiceMessages';
import type {Translation} from '../../maps';
/** Front FR0: French (fr) for the language selector and its reload dialog. The option names are the autonyms of src/i18n/languages.json. A web adaptation by OpenVireo, not CLEA's. */
export const LANGUAGE_CHOICE_FR:Translation<typeof LANGUAGE_CHOICE_EN>=Object.freeze({
 legend:'Langue / Language',
 title:'Changer de langue ?',
 reload:(language:string)=>`La page va se recharger en ${language}, sur la même page du site.`,
 lost:'Le travail qui n’est qu’à l’écran est perdu : la position actuelle du télescope, les poses en cours, les mesures, les fenêtres ouvertes, le mode enseignant et tout ce que vous n’avez pas enregistré dans un fichier.',
 kept:'Les fichiers que vous avez enregistrés sur votre ordinateur ne sont pas affectés ; Restaurer l’investigation (JSON) recharge une investigation. Ce navigateur conserve aussi vos résultats d’observation confirmés et vos préférences d’affichage.',
 save:'Enregistrer l’investigation',
 saveNote:'Enregistrer l’investigation télécharge d’abord un fichier de votre travail actuel. Changez ensuite de langue.',
 change:'Changer et recharger',
 cancel:'Annuler',
 preview:'Aperçu avant la publication : la langue est choisie par l’adresse (?lang=) et n’est pas enregistrée.',
 notRemembered:'Ce navigateur ne permet pas à OpenVireo de mémoriser ce choix : il ne s’applique qu’à ce chargement de la page.',
 originals:'Afficher les textes propres de VIREO en anglais',
 originalsNote:'Les textes de menus, de fenêtres et de messages de VIREO apparaissent en anglais, exactement comme VIREO les écrit. Les textes propres d’OpenVireo restent dans la langue choisie. S’applique au prochain chargement de la page.',
 originalsNotStored:'Ce navigateur ne permet pas à OpenVireo de mémoriser cette option.',
});
