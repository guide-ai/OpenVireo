import type {OBJECT_X_MEASURE_EN} from '../../../objectx/ObjectXMessages';
import type {Translation} from '../../maps';
/** Front FR6: French (fr) for the E08 position-measuring tool (blink, centroids, plate solution, motion). A web adaptation by
 * OpenVireo, not CLEA’s. Nothing here names or describes a target. */
export const OBJECT_X_MEASURE_FR:Translation<typeof OBJECT_X_MEASURE_EN>=Object.freeze({
 title:'Mesurer les positions',
 intro:'Comparez deux images par clignotement pour repérer ce qui a bougé, puis cliquez sur une source pour la mesurer. Pour obtenir une solution astrométrique, marquez au moins trois étoiles de référence avec des coordonnées de catalogue sur une image, ou utilisez les coordonnées d’image écrites dans son en-tête.',
 adaptation:'Adaptation web : l’original envoie les images au programme externe d’astrométrie CLEA Astrometry Toolkit. Cet outil suit le guide d’utilisation de ce programme (pixel le plus brillant à moins de 8 pixels, poids au cube, six constantes de plaque) et n’en est pas un portage.',
 frame:(n,label)=>`Image ${n} : ${label}`,noFrames:'Aucune image chargée.',
 blinkStart:'Démarrer le clignotement',blinkStop:'Arrêter le clignotement',blinkInterval:'Intervalle de clignotement (ms)',showFrame:'Afficher l’image',
 roleTarget:'Cible',roleReference:'Étoile de référence',roleLegend:'Prochaine marque :',
 refRa:'AD du catalogue (h m s)',refDec:'Déc. du catalogue (° ′ ″)',refInvalid:'Saisissez l’AD de l’étoile de référence en h m s et la Déc. en ° ′ ″.',
 cursor:(x,y)=>`Curseur x ${x}, y ${y}`,measure:'Mesurer au curseur',viewport:'Image ; les flèches déplacent le curseur, Entrée lance la mesure',
 keyboardHelp:'Les flèches déplacent le curseur d’un pixel (dix avec Maj). Entrée ou Espace lance la mesure.',
 rangeLow:'Seuil bas',rangeHigh:'Seuil haut',
 rangeNote:'Les seuils fixent à la fois l’étirement de l’affichage et les poids du centroïde (valeur par défaut de la version web : seuil bas au niveau du ciel, soit la médiane de l’image ; seuil haut à 50 % de la plage de l’image). Si « Mesurer au curseur » ne trouve aucune source au-dessus du seuil bas, abaissez le seuil bas ou faites une pose plus longue.',
 blinkAligned:'Le clignotement est aligné sur les deux premières étoiles de référence de chaque image.',
 blinkRaw:'Clignotement des images brutes (même pointage supposé) ; marquez deux étoiles de référence sur chaque image pour les aligner.',
 plateTitle:'Solutions astrométriques',plateFrame:(n,refs)=>`Image ${n}, étoiles de référence : ${refs}`,plateNone:(n,refs)=>`Image ${n}, étoiles de référence : ${refs} (au moins 3 sont nécessaires)`,
 plateDegenerate:n=>`Image ${n} : les étoiles de référence sont presque alignées.`,plateRms:(rms,scale)=>`rms ${rms}″, échelle ${scale}″/pixel`,colResidual:'Résidu (″)',
 table:'Mesures',colFrame:'Image',colRole:'Marque',colX:'x',colY:'y',colRa:'AD',colDec:'Déc.',colUt:'UT',colMethod:'Solution',remove:'Retirer',
 notSolved:'sans solution',methodPlate:'constantes de plaque',methodWcs:'WCS de l’en-tête',
 motion:(rate,pa,arcsec,hours)=>`Mouvement : ${rate}″/h vers l’angle de position ${pa}° (${arcsec}″ en ${hours} h).`,
 motionNone:'Mesurez la cible sur deux images prises à des heures différentes pour obtenir son mouvement.',
 errors:Object.freeze({bounds:'Le curseur est en dehors de l’image.',range:'Le seuil bas doit être inférieur au seuil haut.','no-signal':'Aucune source au-dessus du seuil bas près du curseur.',references:'Trop de marques ; retirez-en d’abord quelques-unes.',degenerate:'Les étoiles de référence sont presque alignées ; choisissez-en d’autres.',wcs:'Cette image n’a pas d’en-tête de coordonnées utilisable.',time:'Les deux images ont la même heure.'}),
});
