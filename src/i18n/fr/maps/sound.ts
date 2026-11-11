import type {SOUND_MESSAGES_EN} from '../../../sound/SoundMessages';
import type {Translation} from '../../maps';
/** Front FR1: French (fr) for the observatory Sound Effects option. A web adaptation by OpenVireo, not CLEA's. */
export const SOUND_FR:Translation<typeof SOUND_MESSAGES_EN>=Object.freeze({
 title:'Effets sonores',
 toggle:'Effets sonores (les sons de la coupole et du télescope de VIREO)',
 hint:'Son pour la coupole, les déplacements, etc.',
 note:'Désactivés tant que vous ne les activez pas, et seulement pour cette visite. Rien n’est téléchargé tant qu’ils sont désactivés ; les activer prépare le son du moteur, et les autres se chargent à leur premier besoin. Dans VIREO, c’était une option enseignant, activée par défaut. La porte de la coupole résonne pendant qu’elle s’ouvre ou se ferme, puis l’un de huit sons de fin retentit ; un déplacement manuel joue le servomoteur, un déplacement vers des coordonnées joue le moteur. Plusieurs de ces effets de 1992–93 proviennent peut-être d’une collection tierce que le CLEA a incluse.',
 loading:'Chargement du son…',
 failed:'Les fonctions sonores de VIREO ne sont pas disponibles : ce navigateur n’a pas pu charger ou lire le son ; les Effets sonores (Sound Effects) sont donc de nouveau désactivés.',
 channel:{dome:'Son de la coupole',telescope:'Son du télescope'},
});
