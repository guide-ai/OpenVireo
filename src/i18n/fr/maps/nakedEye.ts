import type {NAKED_EYE_MESSAGES_EN} from '../../../observatory/FieldInfoMessages';
import type {Translation} from '../../maps';
import {plural} from '../../plural';
/** Front FR1: French (fr) for the naked-eye sky through the open dome (Naked Eye Star). A web adaptation by OpenVireo, not CLEA's. */
export const NAKED_EYE_FR:Translation<typeof NAKED_EYE_MESSAGES_EN>=Object.freeze({
 eyebrow:'VIREO · Coupole ouverte',title:'Ciel à l’œil nu',
 help:'Les étoiles brillantes (V ≤ 5.5) que vous verriez à l’œil nu à travers la coupole ouverte, telles que VIREO les dessine : environ 31° de large et 40° de haut, centrées à 45° au-dessus de l’horizon dans la direction vers laquelle pointe le télescope. Faites un clic droit sur une étoile (ou déplacez le curseur avec les flèches du clavier et appuyez sur Entrée) pour voir ses données.',
 skyLabel:'Ciel à l’œil nu à travers la coupole. Faites un clic droit sur une étoile, ou utilisez les flèches du clavier et Entrée, pour ouvrir Étoile à l’œil nu (Naked Eye Star).',
 loading:'Chargement du fichier des étoiles à l’œil nu…',
 fileError:'Le fichier des étoiles à l’œil nu (NkdEye.dat) n’a pas pu être chargé ou ne correspondait pas à sa taille et à son SHA-256 enregistrés.',
 caption:(site:string,utc:string,count:number)=>`${site} · ${utc} UT (l’instant où la coupole s’est ouverte ; fermez et rouvrez la coupole pour redessiner) · ${plural('fr',count,{one:`${count} étoile visible`,other:`${count} étoiles visibles`})}.`,
 adaptation:'Adaptation web : les étoiles sont dessinées comme des disques selon le niveau de luminosité de VIREO, au lieu de ses sprites d’étoiles, et les volets de la coupole ne sont pas dessinés. Les positions, la région visible (y compris la particularité de VIREO qui supprime de nombreuses étoiles juste à l’ouest de la ligne centrale quand on fait face au sud) et la sélection par clic droit suivent l’original.',
 showAtCursor:'Afficher l’étoile au curseur',
 tapAdaptation:'Adaptation web pour les écrans tactiles : touchez le ciel pour déplacer le curseur (+), puis appuyez sur « Afficher l’étoile au curseur ». Un simple toucher n’ouvre pas l’étoile, car un clic gauche ne fait rien dans VIREO.',
 magNote:'Comme dans VIREO, Mag. V peut être saisie mais rien n’est enregistré.',
});
