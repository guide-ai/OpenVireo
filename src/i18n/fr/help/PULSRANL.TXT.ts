// Front FR-HELP [W]: OpenVireo's French (fr) web adaptation of VIREO's PULSRANL.TXT. Not CLEA's text: the original bytes, hashes and
// provenance are unchanged (public/original). Loaded only by the help viewer, never with the main French chunk.
export const language='fr';
export const sourceName='PULSRANL.TXT';
export const sourceSha256='9d1cb3ff7daf80cc79f9a97f0b8f13a740b41f7162ba46f3d0cb31e8ac851bf4';
export const text=`**Charger les données de pulsar consignées**
Pour charger dans la fenêtre d’analyse de données des données de
pulsar consignées puis enregistrées, choisissez « Fichier » (File)->
« Charger... » (Load...) dans le menu d’analyse de données, puis
sélectionnez le fichier dans la boîte de dialogue qui apparaît.  Les
fichiers contenant des données de pulsar consignées doivent porter
l’extension « .PLR ».

REMARQUE : si vous accédez à la fenêtre d’analyse de données juste
après avoir consigné des données de pulsar, les dernières données
consignées apparaissent automatiquement dans la fenêtre d’analyse de
données, qu’elles aient été enregistrées ou non.

**Enregistrer les données de pulsar consignées**
Pour enregistrer les données de pulsar actuelles, choisissez
« Fichier » (File)->« Enregistrer... » (Save...) dans le menu
d’analyse de données.  Une boîte de dialogue apparaît et vous permet de
saisir ou de sélectionner un nom pour le fichier enregistré.  Vous
pouvez utiliser le nom que vous voulez ; la boîte de dialogue vous
suggère un nom généré à partir de vos informations de connexion.  Vous
devriez toujours utiliser l’extension « .PLR » pour ces fichiers, afin
d’éviter des difficultés et des confusions par la suite.

Vous pouvez aussi enregistrer les données de pulsar actuelles en
choisissant « Fichier »->« Enregistrer les données consignées... »
(Save Recorded Data...) dans le menu principal.

**Voir les propriétés des données**
Pour accéder à une boîte de dialogue qui affiche les propriétés des
données de pulsar actuelles, choisissez « Fichier » (File)->
« Propriétés... » (Properties...) dans le menu d’analyse de données.
Les propriétés affichées dans la boîte de dialogue comprennent :

    Identification de l’objet
    Heure de début des données (numéro de jour julien moins 2 400 000)
    Ouverture du télescope (mètres)
    Fréquence (MHz) et gain relatif de chaque récepteur consigné
    Nombre de points de données (pour chaque récepteur consigné)
    Intervalle de temps (ms) entre les points de données
    Nom du fichier

La boîte de dialogue des propriétés apparaît aussi automatiquement
lorsque des données sont chargées.  Vous ne pouvez modifier aucune des
propriétés affichées, car elles reflètent des informations sur des
données déjà enregistrées.

**Commandes**
Les commandes suivantes se trouvent sur le côté droit de la fenêtre
d’analyse de données :

    Échelle verticale (Vertical Scale) - Utilisez les boutons d’échelle
    verticale pour ajuster l’échelle de chaque panneau d’affichage.
    L’échelle peut varier par facteurs de 2, d’un minimum de 0.125 à un
    maximum de 8.  (Un facteur d’échelle de 1 affiche les données
    exactement comme elles ont été consignées.)  Ce facteur n’agit que
    sur l’affichage et ne modifie pas les données sous-jacentes.

    Défilement horizontal (Horizontal Pan) - Utilisez les flèches de
    défilement horizontal gauche et droite pour faire varier la plage
    de données consignées affichée dans les panneaux.  La plage
    affichée (en secondes depuis le début des données) est indiquée par
    les affichages à gauche et à droite sous les panneaux d’affichage.

    Vitesse de défilement (Pan Rate) - La commande de vitesse de
    défilement modifie la rapidité du défilement horizontal.

    Zoom horizontal (Horizontal Zoom) - Utilisez les commandes de zoom
    « Avant » (In) et « Arrière » (Out) pour agrandir ou comprimer la
    plage de données consignées affichée dans les panneaux.  Le facteur
    de zoom va de 0.125 à 8 par facteurs de 2.  (Un facteur de zoom de
    1 affiche les données exactement comme elles ont été consignées.)
    La plage affichée (en secondes depuis le début des données) est
    indiquée par les affichages à gauche et à droite sous les panneaux
    d’affichage.

    Réinitialiser (Reset) - Le bouton « Réinitialiser » ramène l’échelle
    verticale de tous les panneaux à 1, le facteur de zoom à 1 et la
    vitesse de défilement à 2.  Les affichages reviennent au début des
    données, et tous les curseurs ainsi que leurs affichages sont
    effacés.

**Effectuer des mesures**
Vous pouvez mesurer des positions sur les panneaux d’affichage en
appuyant puis en faisant glisser la souris.  Le bouton droit de la
souris commande un curseur de « référence » qui apparaît à la même
position sur les trois panneaux.  L’affichage vert sous les panneaux
donne la position du curseur de référence en secondes depuis le début
des données.

Le bouton gauche de la souris commande à la fois un curseur vertical
et un curseur horizontal pour chaque panneau.  À droite de chaque
panneau se trouvent les affichages des curseurs de ce panneau.  La
position du curseur vertical (affichage de couleur cyan) est donnée en
secondes depuis le début du fichier.  La position du curseur
horizontal (affichage de couleur magenta) est un indicateur de force
relative qui tient compte à la fois du facteur d’échelle verticale du
panneau d’affichage et du gain relatif appliqué lors de la
consignation des données (voir la rubrique d’aide « Voir les
propriétés des données »).  Pour faire passer le bouton gauche de la
souris du curseur vertical au curseur horizontal, ou inversement,
pour chaque panneau, cliquez sur l’affichage correspondant.

Agrandir l’affichage horizontalement (zoom « Avant ») peut aider à
déterminer et à mesurer avec précision la position des impulsions.

**Consigner les mesures**
Suivez la procédure ci-dessous pour consigner vos mesures :

    1) Effectuez des mesures en positionnant les curseurs comme
    décrit dans la rubrique d’aide « Effectuer des mesures ».  Vous
    pouvez effectuer des mesures dans tous les panneaux d’affichage
    actifs à ce moment, si vous le souhaitez.

    2) Choisissez « Résultats » (Results)->« Consigner les mesures
    actuelles... » (Record Current Measurements...) dans le menu
    d’analyse de données.

    3) Une série de boîtes de dialogue apparaît ; elles montrent les
    mesures et les propriétés à consigner pour chaque panneau qui a des
    mesures non consignées.  Vous pouvez ajouter un commentaire à
    chaque enregistrement de mesure si vous le souhaitez.  Choisissez
    « OK » pour consigner la mesure, ou « Annuler » (Cancel) pour
    l’ignorer pour le moment.

Chaque mesure que vous consignez est ajoutée à la liste de mesures
actuelle.  Consultez les rubriques d’aide « Revoir les mesures
consignées », « Enregistrer les mesures consignées » et « Effacer la
liste de mesures » pour savoir comment gérer les enregistrements de
cette liste.

**Revoir les mesures consignées**
Vous pouvez revoir à tout moment la liste actuelle des mesures
consignées, dès que vous avez commencé à consigner des mesures.
Choisissez « Résultats » (Results)->« Revoir les mesures consignées... »
(Review Recorded Measurements...) dans le menu d’analyse de données.
Une boîte de dialogue qui affiche tous les enregistrements actuels
apparaît.  Pour sélectionner un enregistrement, cliquez dessus avec la
souris.  Vous pouvez rechercher les enregistrements qui contiennent une
chaîne de texte donnée (choisissez « Localiser... » (Find...)).  Une
fois un enregistrement sélectionné, vous pouvez l’afficher et modifier
son champ de commentaire (choisissez « Modifier... » (Edit...)), ou le
supprimer de la liste (choisissez « Supprimer » (Delete)).

Lorsque vous avez fini de revoir les enregistrements, choisissez « OK »
ou « Annuler » (Cancel).  Toutes les modifications que vous avez
apportées aux enregistrements de la liste (modifications ou
suppressions) sont abandonnées si vous choisissez « Annuler ».

**Enregistrer les mesures consignées**
Pour enregistrer dans un fichier votre liste actuelle de mesures
consignées, choisissez « Résultats » (Results)->« Enregistrer les
mesures consignées... » (Save Recorded Measurements...) dans le menu
d’analyse de données.  Indiquez un nom de fichier dans la boîte de
dialogue qui apparaît.  Les données sont enregistrées dans un format
(valeurs séparées par des virgules, CSV) accepté par les tableurs
usuels.  Vous devriez utiliser l’extension « .CSV » pour tous les
fichiers que vous créez ici.  (Voir la rubrique d’aide « Accéder au
tableur ».)

Si vous choisissez un nom de fichier qui existe déjà, vous écraserez
les données existantes.  Vous en serez averti et aurez la possibilité
de modifier votre choix si ce n’est pas ce que vous voulez.  (Voir la
rubrique d’aide « Effacer la liste de mesures ».)

**Effacer la liste de mesures**
Normalement, la liste de mesures actuelle reste intacte, même
lorsqu’elle est enregistrée dans un fichier, et les nouvelles mesures
lui sont ajoutées.  (Cela signifie que vous pouvez enregistrer un
fichier, ajouter d’autres mesures, puis enregistrer de nouveau dans le
même fichier sans perdre aucune donnée.)  Si vous voulez créer une
nouvelle liste de mesures, sans aucun enregistrement antérieur,
choisissez « Résultats » (Results)->« Effacer la liste de mesures »
(Clear Measurement List) dans le menu d’analyse de données.

**Accéder au tableur**
Vous pouvez peut-être accéder à un tableur pour analyser vos données
directement depuis ce TP.  Si la commande est activée, choisissez
« Résultats » (Results)->« Tableur » (Spreadsheet) dans le menu
d’analyse de données.  Si vous avez enregistré récemment un fichier
destiné au tableur (voir la rubrique d’aide « Enregistrer les mesures
consignées »), ce fichier est chargé automatiquement à l’ouverture du
tableur.  Si vous voulez charger vous-même un fichier dans le tableur,
n’oubliez pas que le type de fichier est « .CSV ».  Vous le trouverez
peut-être sous la rubrique « Fichiers texte » dans la boîte de dialogue
de chargement de fichier du tableur.

**Imprimer l’image de l’écran**
La commande « Fichier » (File)->« Imprimer l’écran... » (Print
Screen...) du menu d’analyse de données vous permet d’imprimer à tout
moment une image de la fenêtre d’analyse de données.  Cette image
montre tous les curseurs à leur position actuelle et les affichages
avec leurs valeurs actuelles.  Cette fonction utilise la fonction
d’impression de Windows et imprime en couleur si une imprimante
couleur est sélectionnée.  L’impression comprend les noms de connexion
pour l’identification, ainsi que les propriétés actuelles des données.

**Fermer la fenêtre d’analyse de données**
Pour fermer la fenêtre d’analyse de données et revenir à la fenêtre
principale, choisissez « Fichier » (File)->« Quitter » (Exit) dans le
menu d’analyse de données, choisissez « Fermer » (Close) dans le menu
Système (cliquez sur la case en haut à gauche), ou cliquez sur la case
« X » en haut à droite (sous Windows 95 seulement).
`;
