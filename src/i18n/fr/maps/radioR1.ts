import type {RADIO_R1_MESSAGES_EN} from '../../../components/RadioR1Messages';
import type {Translation} from '../../maps';
/** Front FR5: French (fr) for the Front R1 radio web texts. A web adaptation by OpenVireo, not CLEA’s; VIREO’s own captions are translated through
 * vireo() (originals.json). */
export const RADIO_R1_FR:Translation<typeof RADIO_R1_MESSAGES_EN>=Object.freeze({
 saveDataNote:'La commande Fichier ▸ Enregistrer les données consignées... (Save Recorded Data) de VIREO (SvRcData1Click 0x567f70) exécute le même enregistrement que le bouton Enregistrer (Save) de l’Analyse de pulsars ; elle est activée tant que des données consignées existent. Ici, elle ouvre l’Analyse de pulsars, dont l’enregistrement vérifié écrit l’acquisition (adaptation web).',
 optionEffectsTitle:'Ce que font ces réglages de VIREO (affichés avec leurs valeurs compilées ; non modifiables ici) :',
 optionEffects:Object.freeze([
  'Tracer les positions des pulsars (Plot Pulsar Positions ; désactivé) : trace les pulsars du catalogue sur la carte du ciel radio.',
  'Écrire le fichier de liste d’objets (Write Hot List File ; désactivé) : affiche Déplacer (Slew) ▸ Liste d’objets (Hot List) ▸ Enregistrer la liste mise à jour... (Save Updated List).',
  'Pos. exacte pour la liste d’objets (Exact Pos for Hot List ; désactivé) : Ajouter l’objet actuel à la liste (Add Current Item to List) mémorise la position du pulsar dans le catalogue au lieu du pointage.',
  'Fonctions sonores (Sound Features ; activé) : le récepteur émet le son des impulsions lorsqu’un périphérique audio existe.',
  'Mode test (Test Mode ; désactivé) : réglage destiné à l’enseignant ; Définir les coordonnées (Set Coordinates) déplace le télescope instantanément.',
  'Identification du pulsar (Pulsar Identification), réglée sur Utiliser le nom B1950 (Use B1950 Name) : donne son nom au titre du récepteur, à l’en-tête de l’acquisition et aux entrées créées par Ajouter l’objet actuel (Add Current Item).',
  'Type de télescope (Telescope Type ; Entièrement orientable) : seul Transit uniquement (Transit Only) modifie le comportement de VIREO ; Arecibo n’a pas de code propre et se comporte comme Entièrement orientable.',
 ]),
 findNote:'Localiser (Find) parcourt chaque ligne stockée (le texte d’origine de chaque mesure, tel qu’écrit par Consigner [Record]) depuis le haut ou après la ligne sélectionnée, sans distinguer majuscules et minuscules, sans reprendre au début en fin de liste, comme dans VIREO. Comme VIREO, il mémorise votre dernière recherche en minuscules. Adaptation web : le texte stocké est celui de ce site ; il peut différer de celui de VIREO par la fin du nom de fichier (le navigateur ne donne pas le dossier) et, rarement, par le dernier chiffre d’un nombre. La recherche mémorisée dure tant que cette page reste ouverte.',
 saveDataOff:'Rien n’a encore été consigné : VIREO garde cet élément désactivé tant que l’analyse ne contient pas de données consignées.',
});
