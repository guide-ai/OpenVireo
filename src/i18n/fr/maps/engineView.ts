import type {ENGINE_VIEW_EN} from '../../../SpectrumEngineMessages';
import type {Translation} from '../../maps';
/** Front FR2: French (fr) for the measuring engine’s web strings (zoom window, pan and readout). A web adaptation by OpenVireo, not CLEA’s. */
export const ENGINE_VIEW_FR:Translation<typeof ENGINE_VIEW_EN>=Object.freeze({
 panLeft:'Décaler la fenêtre de 100 Å vers la gauche',
 panRight:'Décaler la fenêtre de 100 Å vers la droite',
 readoutEmpty:'Faites glisser dans le graphique, ou placez-y le focus et utilisez les touches fléchées, pour lire une longueur d’onde.',
 nearest:'Raie de comparaison la plus proche',
 nearestNone:'Aucune raie de comparaison à moins de 100 Å du curseur.',
 nearestFound:(label:string,shifted:string)=>`Raie de comparaison la plus proche : ${label} à ${shifted} Å.`,
 plotHelp:'Graphique du spectre. Faites glisser, ou utilisez les touches fléchées, pour déplacer le curseur ; faites un clic droit ou appuyez sur N pour obtenir la raie de comparaison la plus proche.',
 window:(min:string,max:string)=>`Fenêtre ${min}–${max} Å`,
 fullViewNote:'Les vues complète et H/K sont des préréglages web ; Zoom et les flèches s’appliquent à la vue normale.',
 note:'Comme dans VIREO, Zoom choisit une fenêtre par pas de 100 Å à partir du début du spectre chargé et intègre d’abord le réglage de z dans sa base (comme Recentrer) ; les flèches déplacent la fenêtre de 100 Å et peuvent dépasser ses extrémités de moins de 100 Å ; la lecture indique la longueur d’onde observée sous le curseur et la hauteur du curseur sur l’axe du graphique, et non la valeur du spectre.',
});
