import type {VARIABLE_STARS_EN} from '../../../variables/VariableStarMessages';
import type {Translation} from '../../maps';
import {plural} from '../../plural';
/** Front FR0 (the header menu name) and Front FR4 (the rest): French (fr) for the variable-star page's web text. A web adaptation by OpenVireo, not CLEA's. VIREO's own
 * captions (Variable Star Data, Simulated Light Curve, their menus and the print lines) are in src/core/variableStarForm.ts
 * and src/core/lightCurvePrint.ts and are translated through vireo() (originals.json). */
/** A count grouped as French groups thousands on screen, with the registry's separator (src/i18n/languages.json `thousands`,
 * the one formatNumber uses) where the English map has en-US's comma. */
const grouped=(n:number)=>n.toLocaleString('en-US').replace(/,/g,' ');
export const VARIABLE_STARS_FR:Translation<typeof VARIABLE_STARS_EN>=Object.freeze({
 nav:'Étoiles variables',
 title:'Étoiles variables et courbes de lumière',
 scope:'Recherchez une étoile dans le catalogue d’étoiles variables de VIREO (CLEA_VStrs.dat, 31 147 enregistrements), lisez ses données de catalogue et affichez la courbe de lumière que VIREO simule pour elle.',
 adaptation:'Adaptation web : dans VIREO, ces données relèvent d’un chemin enseignant (Mode édition [Edit Mode]) : GCVS dans la boîte Objet du catalogue (Catalog Object), ou Informations sur le champ (Field Information) › Étoiles variables (Variable Stars) › Obtenir les données de la sélection (Get Selection Data) dans le panneau de commande du télescope. Les deux existent sur ce site avec le Mode édition activé (dans les Options de simulation optique [Optical Simulation Options]) ; cette page permet aussi à n’importe qui de chercher directement dans le catalogue. Les fenêtres Données de l’étoile variable (Variable Star Data) et Courbe de lumière simulée (Simulated Light Curve) suivent l’original.',
 guideTitle:'Comment utiliser cet outil',
 guide:Object.freeze([
  'Saisissez une partie du nom d’une étoile (par exemple « del Cep » ou « RR Lyr ») ou choisissez un type de variabilité, puis, sur une ligne, appuyez sur Ouvrir.',
  'La fenêtre Données de l’étoile variable (Variable Star Data) liste les valeurs du catalogue : position, type, magnitude maximale, magnitude minimale (ou, après une parenthèse ouvrante, l’amplitude), époque du catalogue (que VIREO trace comme le maximum de luminosité, bien que, pour les binaires à éclipses, le catalogue donne un minimum), période, temps de montée (M-m/D) et spectre.',
  'Choisissez Données (Data) › Afficher la courbe de lumière (Display Light Curve) pour voir 1.5 cycle de la courbe de lumière simulée. VIREO trace l’époque du catalogue comme le maximum de luminosité (phase 0), quel que soit le type.',
  'Utilisez Données (Data) › Enregistrer le texte (Save Text) › Tel qu’affiché (As Displayed) pour télécharger la liste sous forme de fichier texte, ou Imprimer (Print) pour l’imprimer.',
 ]),
 guideModel:'À propos de la courbe : VIREO trace la même courbe en forme de céphéide pour tous les types, construite uniquement à partir du maximum, du minimum, de la période et du M-m/D du catalogue (50 % quand le catalogue n’en donne aucun). Elle n’a pas de bruit et n’est pas une observation. Les binaires à éclipses et les variables irrégulières ne ressemblent pas vraiment à cela.',
 loading:'Chargement du catalogue d’étoiles variables…',
 loadError:'Le catalogue d’étoiles variables inclus n’a pas pu être chargé ou ne correspondait pas à sa taille et à son SHA-256 enregistrés. Rechargez la page pour réessayer.',
 searchTitle:'Rechercher une étoile variable',
 nameLabel:'Le nom de l’étoile contient',
 typeLabel:'Type de variabilité',
 allTypes:'Tous les types',
 typeOption:(type:string,count:number)=>`${type||'(vide)'} — ${grouped(count)}`,
 results:(shown:number,total:number)=>total===0?'Aucun enregistrement ne correspond.':shown<total?`Affichage des ${shown} premiers enregistrements correspondants sur ${grouped(total)}, dans l’ordre du catalogue (ascension droite). Affinez la recherche pour voir les autres.`:plural('fr',total,{one:`${grouped(total)} enregistrement correspondant.`,other:`${grouped(total)} enregistrements correspondants.`}),
 columns:['ID GCVS','Type','AD (h)','Déc. (°)','Max','Min / ampl.','Période (j)',''],
 open:'Ouvrir',
 openLabel:(name:string)=>`Ouvrir ${name}`,
 noPeriod:'—',
 listTypeCodesNote:'Dans VIREO, cet élément de menu ne fait que basculer sa propre coche ; rien d’autre ne la lit.',
 saveAdaptation:'Adaptation web : le texte est téléchargé par votre navigateur (une ligne par ligne de la liste, avec des fins de ligne Windows) au lieu d’une boîte de dialogue d’enregistrement.',
 riseDefaultedNote:'Cet enregistrement n’avait pas de valeur M-m/D. L’ouverture de sa courbe de lumière l’a fixée à 50 % en mémoire, comme le fait VIREO ; la liste affiche donc maintenant 0.50.',
 curveLabel:(name:string)=>`Courbe de lumière simulée pour ${name} : magnitude en fonction de la phase, 1.5 cycle à partir de l’époque du catalogue.`,
 unavailable:Object.freeze({
  'period-zero':'Pas de courbe : cet enregistrement n’a pas de période (période de 0 jour). VIREO divise par la période et s’arrête sur une erreur de virgule flottante après avoir tracé les axes ; aucun point de la courbe n’est donc tracé.',
  'zero-decline-fraction':'Pas de courbe : M-m/D vaut 100 %, la partie descendante de la courbe a donc une longueur nulle et VIREO s’arrête sur une erreur de virgule flottante avant de la tracer.',
  'axis-range-zero':'Pas de fenêtre de courbe de lumière : les limites d’axe de la magnitude la plus brillante et de la plus faible sont égales, et VIREO divise par leur différence avant d’afficher la fenêtre.',
  'magnitude-system-empty':'Le texte du système de magnitudes est vide : VIREO cesse de tracer avec une erreur après l’axe des magnitudes ; l’axe des phases et la courbe ne sont donc pas tracés.',
  'non-finite':'Pas de courbe : une valeur de cet enregistrement dépasse ce que le modèle peut calculer.',
 }),
 curveAdaptation:'Le graphique conserve la disposition, les couleurs et les positions en pixels de VIREO ; les polices diffèrent.',
 printTitle:(caption:string)=>`Aperçu avant impression — ${caption}`,
 printHelp:'Aperçu avant impression de ce que VIREO met sur papier : la date et l’heure (ici au format de votre navigateur), la ligne de la table de laboratoire, les lignes de l’étudiant et du TP saisies dans VIREO (non disponibles sur ce site, un texte provisoire les remplace), les lignes de la liste et, pour la courbe de lumière, le graphique. La mise en page et les polices ne sont pas reproduites. Le titre du travail d’impression de VIREO n’est pas imprimé sur la page.',
 printCurveLayout:(monochrome:boolean)=>`La page de la courbe de lumière suit l’impression de VIREO dans l’orientation choisie ici (VIREO utilise celle de l’imprimante) : en portrait, le graphique suit sur la même page ; en paysage, VIREO ajoute « (Image de l’écran imprimée sur la page suivante) » et imprime le graphique page 2. ${monochrome?'Imprimer en couleur (Print in Color) est désactivé, le graphique s’imprime donc en noir sur blanc.':'Imprimer en couleur (Print in Color) est activé, le graphique s’imprime donc avec les couleurs de l’écran.'} VIREO trace le graphique par-dessus la ligne du titre ; ici, il est placé en dessous.`,
 printOrientation:'Orientation de la page',
 portrait:'Portrait',
 landscape:'Paysage',
 printStudentPlaceholder:'[texte de l’étudiant et du TP saisi dans VIREO : non récupéré sur ce site]',
 printButton:'Imprimer…',
 printClose:'Fermer l’aperçu',
 printError:'L’impression n’est pas disponible dans cette fenêtre du navigateur.',
});
