// Front FR-HELP 6: OpenVireo's French (fr) web adaptation of VIREO's WdgPltHlp.TXT. Not CLEA's text: the original bytes,
// hashes and provenance are unchanged (public/original). Loaded only by the help viewer, never with the main French chunk.
export const language='fr';
export const sourceName='WdgPltHlp.TXT';
export const sourceSha256='01d062eb13b41a197aa6123256a991c5b4b4194b47968d816d60d1302f5fd10e';
export const text=`**Tracer les données**
L’outil de diagramme en cône LSS affiche les données de décalage vers le
rouge sous la forme d’un « diagramme en cône » bidimensionnel. À mesure
que vous consignez des données avec l’outil de mesure des spectres, les
points apparaissent automatiquement sur le diagramme en cône. Il se peut
aussi que les données mesurées par d’autres membres de votre groupe
s’affichent automatiquement sur votre diagramme en cône.

Rubriques connexes :
    Charger les données
    Imprimer le diagramme en cône
    Rubriques sous « Options du diagramme en cône »
    Rubriques sous « Tracé automatique »

**Charger les données**
Les données de décalage vers le rouge LSS enregistrées précédemment
peuvent être chargées et affichées sur le diagramme en cône. Choisissez
« Outils » (Tools)->« Éditeurs de résultats » (Results Editors)->
« Résultats d’observation » (Observational Results)->« Charger les
données enregistrées » (Load Saved Data) dans le menu principal (et non
dans le menu de l’outil de diagramme en cône). Les données chargées
apparaîtront alors sur le diagramme en cône.

REMARQUE :
    1) Les données à charger pour le tracé dans le TP LSS doivent avoir
    été enregistrées depuis le TP LSS. Les données des autres TP de
    VIREO ne sont pas compatibles.

    2) Les données du diagramme en cône de l’ancien TP LSS de CLEA ne
    sont pas compatibles avec la version de VIREO.

**Imprimer le diagramme en cône**
Pour imprimer le diagramme en cône, choisissez « Fichier » (File)->
« Imprimer le diagramme en cône... » (Print Wedge Plot...) dans le
menu. Le tracé s’imprimera normalement en noir et blanc. Vous verrez
l’affichage passer en noir et blanc, puis revenir en couleur une fois
l’image à imprimer capturée.

**Définir le type de grille**
Vous pouvez régler la grille du diagramme en cône pour qu’elle affiche
la vitesse, le paramètre de décalage vers le rouge « z », ou aucune
grille. Pour définir le type de grille, choisissez « Fichier » (File)->
« Options... » dans le menu du diagramme en cône et faites une sélection
dans la boîte « Type de grille » (Grid Type).

**Définir la taille des points**
Pour modifier la taille des points tracés sur le diagramme en cône LSS,
choisissez « Fichier » (File)->« Options... » dans le menu du diagramme
en cône et choisissez une taille dans la boîte « Points tracés »
(Plotted Points).

Rubriques connexes :
    Définir le style des points

**Définir le style des points**
Les points tracés sur le diagramme en cône LSS peuvent être des cercles
vides ou pleins. Pour modifier le style, choisissez « Fichier » (File)->
« Options » dans le menu du diagramme en cône et choisissez un style
dans la boîte « Points tracés » (Plotted Points).

Rubriques connexes :
    Définir la taille des points

**Activer/désactiver le tracé automatique**
Pour utiliser la fonction de tracé automatique LSS, votre enseignant
doit créer un fichier de groupe sur un périphérique partagé auquel vous
et les autres membres de votre groupe avez accès (en lecture et en
écriture). Vous devrez ensuite indiquer le chemin et le fichier dans
votre programme, et régler l’intervalle de mise à jour. (Voir les
rubriques d’aide connexes.) Pour activer ou désactiver la fonction de
tracé automatique, choisissez « Fichier » (File)->« Options... » dans le
menu du diagramme en cône et cochez ou décochez la case intitulée
« Tracer automatiquement » (Auto Plot On).

Rubriques connexes :
    Définir le nom/chemin du fichier de tracé automatique
    Définir l’intervalle de mise à jour du tracé automatique

**Définir le nom/chemin du fichier de tracé automatique**
Pour définir le nom et le chemin du fichier de tracé automatique,
choisissez « Fichier » (File)->« Options... » dans le menu du diagramme
en cône. Assurez-vous que la case intitulée « Tracer automatiquement »
(Auto Plot On) est cochée. Vous pouvez alors saisir le chemin et le nom
du fichier de tracé du groupe dans les boîtes correspondantes. (Le
chemin et le nom de fichier requis doivent vous être fournis par votre
enseignant.) Vous pouvez aussi utiliser le bouton « Parcourir... »
(Browse...) pour définir le chemin.

Rubriques connexes :
    Activer/désactiver le tracé automatique
    Définir l’intervalle de mise à jour du tracé automatique

**Définir l’intervalle de mise à jour du tracé automatique**
Pour définir l’intervalle de mise à jour du tracé automatique,
choisissez « Fichier » (File)->« Options... » dans le menu du diagramme
en cône. Assurez-vous que la case intitulée « Tracer automatiquement »
(Auto Plot On) est cochée. Vous pouvez alors saisir un intervalle de
mise à jour, en minutes, dans la boîte correspondante.

Chaque fois que l’intervalle de mise à jour est atteint, votre
programme accède au fichier de tracé du groupe. Les nouvelles données
que vous avez mesurées sont copiées dans le fichier du groupe, et les
nouvelles données envoyées au fichier du groupe par d’autres sont
copiées dans votre programme et affichées sur votre diagramme en cône.
Les couleurs des points tracés indiquent quels points vous avez mesurés
et lesquels ont été mesurés par d’autres membres de votre groupe.

Rubriques connexes :
    Activer/désactiver le tracé automatique
    Définir le nom/chemin du fichier de tracé automatique
`;
