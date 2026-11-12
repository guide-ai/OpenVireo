import type {BundledHotListFailure} from '../../../io/bundledHotList';
import type {POLISH_MESSAGES_EN} from '../../../polish/PolishMessages';
import type {Translation} from '../../maps';

const FILE_REASONS:Readonly<Record<BundledHotListFailure,string>>=Object.freeze({download:'n’a pas pu être téléchargé',size:'n’a pas la taille enregistrée',sha256:'ne correspond pas au SHA-256 enregistré'});

/** Front FR0, FR1: French (fr) for the polish texts (About box, credits, results editors, guides). A web adaptation by OpenVireo, not CLEA's. */
export const POLISH_FR:Translation<typeof POLISH_MESSAGES_EN>=Object.freeze({
 spectrometerIndex:Object.freeze({
  title:'Où obtenir un spectre',
  intro:'Le spectromètre de VIREO s’utilise depuis l’observatoire, le télescope pointé sur une cible. Dans OpenVireo, chaque TP a sa propre voie vérifiée vers le spectromètre :',
  routesTitle:'Voies vers le spectromètre',
  routes:Object.freeze([
   Object.freeze({label:'Pose d’une étoile du catalogue',help:'le spectre de l’étoile du catalogue prise en charge, avec Enregistrer et Imprimer.'}),
   Object.freeze({label:'Pose d’une galaxie',help:'les treize galaxies de Hubble.HTL (loi de Hubble).'}),
   Object.freeze({label:'Relevé LSS',help:'spectres de galaxies dans les neuf champs LSS.'}),
   Object.freeze({label:'Objet X',help:'spectres des cibles de l’Objet X.'}),
   Object.freeze({label:'Multi-Spec',help:'le panneau du spectromètre multiobjet dans l’observatoire, sur les champs de TP inclus (et dans le TP de l’Objet X).'}),
   Object.freeze({label:'Analyseur de spectres',help:'mesurez les décalages des raies et consignez les décalages vers le rouge.'}),
   Object.freeze({label:'Classification',help:'classez les spectres d’étoiles par rapport aux étalons.'}),
  ]),
  retired:'Cette page affichait un aperçu de profils de sources préparés (M82, Coma1, Coma2) avant l’existence de l’acquisition. Elle a été retirée le 2026-10-29 ; les voies ci-dessus la remplacent.',
 }),
 clusterGuide:Object.freeze({nav:'Guide du diagramme HR des amas'}),
 multiSpecPrint:Object.freeze({unavailable:'Imprimer le champ de sélection (Print Selection Field) n’est pas disponible : aucun champ Multi-Spec n’est affiché ici.'}),
 infoListPrint:Object.freeze({
  note:'Aperçu avant impression de la page de liste de VIREO : la date et l’heure (ici au format de votre navigateur), la ligne de la table de laboratoire (non enregistrée sur ce site), la ligne de l’étudiant (vide : il n’y a pas de connexion ici), le titre de la fenêtre et les lignes de la liste, en Courier. L’espacement des lignes et les retraits suivent la page de VIREO ; les métriques de l’imprimante ne sont pas reproduites. Le titre du travail d’impression de VIREO n’est pas imprimé sur la page.',
 }),
 siteInfo:Object.freeze({
  note:'Dans VIREO, cette fenêtre de liste masque ses menus Rechercher (Search), Enregistrer le texte (Save Text) et Édition (Edit) pour les informations sur le site, de sorte que seuls Imprimer (Print) et Fermer (Close) sont proposés.',
  printNote:'Adaptation web : VIREO imprime les lignes de la liste sous son en-tête partagé sur l’imprimante ; ici sont imprimés la date, le titre et les lignes.',
 }),
 hotListEdit:Object.freeze({
  note:'Modifier, Supprimer et Annuler (Edit, Delete and Undo) changent la liste d’objets partagée, comme le fait l’éditeur Listes d’objets d’origine ; Annuler ne défait que la dernière modification ou suppression faite ici.',
  deleteNote:'Adaptation web : la ligne est retirée de la liste partagée ; Annuler la remet à sa place dans le fichier (VIREO la réinsère selon l’AD).',
 }),
 hotListPopup:Object.freeze({
  note:'Modifier, Supprimer et Annuler (Edit, Delete and Undo) se trouvent dans l’éditeur Listes d’objets d’origine de cette page.',
 }),
 cameraFieldSize:Object.freeze({
  note:'Pour le télescope appliqué, comme VIREO l’affiche à l’ouverture de la caméra (ici avec deux décimales).',
 }),
 terminateSlew:Object.freeze({
  note:'Adaptation web : VIREO suspend le déplacement pendant qu’il pose la question ; ici le télescope continue de se déplacer jusqu’à ce que vous répondiez (s’il arrive avant, la question se ferme). Oui l’arrête là où il est ; Non le laisse continuer.',
 }),
 comparison:Object.freeze({
  clear:'Effacer la comparaison',none:'Aucune (effacée)',
  note:'Spectre de comparaison (Comparison Spectrum) › Effacer (Clear) de VIREO : retire les raies de comparaison du graphique et du tableau. Choisissez une liste pour les afficher de nouveau. L’état effacé n’est pas enregistré ; une investigation enregistrée conserve la liste choisie.',
 }),
 results:Object.freeze({
  help:'Outils › Éditeurs de résultats (Results Editors) de VIREO. Résultats d’observation ouvre vos résultats d’observation dans l’analyseur de spectres ; Résultats de pulsars ouvre les mesures de pulsars enregistrées dans l’analyse des pulsars.',
 }),
 pulsarPrint:Object.freeze({
  note:'Imprimer la fenêtre (Print Window) de VIREO (PrintScreen1Click 0x56d9d8, Front RE5) imprime son propre en-tête et les paramètres des données, puis l’image de la fenêtre. Comme VIREO, l’ouvrir fait passer tous les panneaux en mode curseur vertical, et les panneaux s’impriment avec les couleurs d’impression de VIREO (fond blanc, axes, étiquettes et traces noirs ; les curseurs gardent leurs couleurs). En paysage, il imprime « (Image de l’écran imprimée sur la page suivante) » et place l’image en page 2. Adaptation web : l’orientation se choisit ici (VIREO prend celle de l’imprimante), la date est celle du navigateur, la table et les noms des étudiants indiquent « (non consigné) » (il n’y a pas de connexion), et l’image est celle des panneaux web, pas l’image de la fenêtre de VIREO.',
  orientation:'Orientation de la page',portrait:'Portrait',landscape:'Paysage',
 }),
 wedgePrint:Object.freeze({
  note:'Adaptation web : Imprimer (Print) de VIREO règle le schéma de couleurs à l’opposé de l’option Imprimer en couleur (Print in Color) (scheme := Env+0x2e8d XOR 1, 0x580fba–0x580fc3), de sorte qu’il imprime en noir et blanc sauf si cette option est cochée (désactivée dans la version compilée ; Options de simulation optique [Optical Simulation Options]). Cette impression suit l’option et utilise la mise en page d’impression du navigateur. La mise en évidence de la sélection n’est pas imprimée.',
 }),
 printSky:Object.freeze({
  note:'VIREO imprime son en-tête (la date et l’heure, ici au format de votre navigateur ; le numéro de la table de laboratoire seulement lorsqu’un numéro est enregistré ; puis la ligne du nom de l’étudiant, vide ici car OpenVireo n’a pas de connexion), l’image du ciel aux couleurs inversées et mise à l’échelle 1.5, et le pied de page avec le centre du champ, la taille du champ, le télescope et l’instrument. Adaptation web : le navigateur compose la page et imprime la vue telle qu’elle est affichée.',
  noInstrument:'(aucun instrument choisi dans la vue du télescope d’OpenVireo)',
 }),
 about:Object.freeze({
  nativeNote:'La boîte À propos (About) de VIREO, avec ses textes tels que lus dans le programme original (son logo n’est pas inclus). Le reste de cette fenêtre décrit cette reconstruction web.',
  siteTitle:'Ce site',
  site:'OpenVireo est une reconstruction web gratuite et non commerciale de VIREO, du Project CLEA, ouverte à tous, refaite dans le navigateur à partir du comportement retrouvé de VIREO et de ses fichiers de données originaux. Ce n’est pas le programme du CLEA et il ne prétend à aucune équivalence avec lui ; les adaptations web sont signalées là où elles apparaissent. La traduction française est une adaptation web d’OpenVireo ; les fichiers et les textes d’origine de VIREO restent inchangés.',
  worksTitle:'Ce qui fonctionne',
  works:Object.freeze([
   'Les sept TP de VIREO ont un parcours web guidé : la loi de Hubble (13 galaxies), la structure à grande échelle, la classification stellaire, la photométrie des Pléiades (24 étoiles), les diagrammes HR d’amas, les pulsars et la quête de l’Objet X.',
   'Observatoire optique : coupole, télescopes, vues du chercheur et du télescope, déplacement du télescope avec la limite d’horizon facultative, listes d’objets, site et date, informations sur le champ et le catalogue, et listes d’étoiles variables et de QSO.',
   'Instruments : spectromètre et photomètre pour les cibles des TP, caméras CCD et infrarouge (interrogation du catalogue en direct), spectromètre multiobjet (Multi-Spec, sur les champs de TP inclus et dans le TP de l’Objet X) et radiotélescope avec son récepteur et l’analyse de pulsars.',
   'Analyse : mesure et classification des spectres, ajustements de Hubble et des Pléiades, diagramme en cône LSS, vos résultats d’observation et les investigations enregistrées.',
  ]),
  privacyTitle:'Confidentialité',
  privacy:Object.freeze([
   'Pas de cookies et pas de comptes : OpenVireo ne vous demande jamais votre nom, votre adresse e-mail ni un mot de passe.',
   'Vos investigations, options et résultats sont enregistrés uniquement sur votre ordinateur : dans le stockage propre à ce navigateur ou dans des fichiers que vous choisissez de télécharger. Rien n’est envoyé.',
   'Les visites sont comptées uniquement de façon agrégée et sans cookies (Cloudflare Web Analytics). Comme tout hébergeur web, Cloudflare reçoit les données techniques de chaque requête, comme votre adresse IP, pour servir la page.',
   'L’interrogation du catalogue en direct des caméras CCD et infrarouge envoie uniquement les coordonnées célestes et le rayon du champ à CDS/VizieR (ou à l’un de ses miroirs officiels). Votre navigateur contacte directement ce serveur ; comme tout site web, il voit donc votre adresse IP.',
   'Les liens externes (l’archive d’images du HST, Aide › Sites web) s’ouvrent dans un nouvel onglet uniquement lorsque vous cliquez dessus, et rien n’est envoyé avec eux.',
  ]),
  creditsTitle:'Crédits',
  credits:Object.freeze([
   'Project CLEA, Gettysburg College : créateur de VIREO et de ses fichiers de données. Soutenu par la NSF (National Science Foundation) et par Gettysburg College.',
   'Données des pulsars : probablement issues du catalogue de pulsars de l’ATNF (Manchester, Hobbs, Teoh & Hobbs 2005) ; cette origine est incertaine.',
   'Catalogues des caméras : CDS/VizieR (doi:10.26093/cds/vizier) ; NOMAD (Zacharias et al. 2004) ; USNO-B1.0 (Monet et al. 2003) ; 2MASS (Skrutskie et al. 2006) via NOMAD.',
   'Champs d’étoiles : sous-ensembles bornés du catalogue d’étoiles-guides (Guide Star Catalog), tels que fournis avec VIREO.',
  ]),
 }),
 print:Object.freeze({
  title:'Aperçu avant impression',button:'Imprimer…',close:'Fermer',error:'L’impression n’est pas disponible dans ce navigateur.',
  missing:'Rien à imprimer : l’image n’est pas affichée en ce moment.',
 }),
 pulsarsHtl:Object.freeze({
  button:'Charger le Pulsars.HTL inclus',
  note:'Adaptation web : la liste de pulsars de VIREO, Pulsars.HTL (8 pulsars), est incluse telle quelle, octet pour octet, dans ce site ; dans VIREO, vous l’ouvrez avec Charger la liste d’objets... (Load Hot List...) depuis son dossier. La charger remplace la liste d’objets actuelle, comme le fait cette commande.',
  error:(code:BundledHotListFailure)=>`Le fichier Pulsars.HTL inclus ${FILE_REASONS[code]} ; la liste d’objets actuelle est inchangée.`,
 }),
});
