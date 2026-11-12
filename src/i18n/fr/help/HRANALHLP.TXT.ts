// Front FR-HELP 6: OpenVireo's French (fr) web adaptation of VIREO's HRAnalHlp.TXT. Not CLEA's text: the original bytes,
// hashes and provenance are unchanged (public/original). Loaded only by the help viewer, never with the main French chunk.
export const language='fr';
export const sourceName='HRAnalHlp.TXT';
export const sourceSha256='3a2f0ef20fd5d89384e429783ceda62325e59a752fd076e02a2c4256143c956b';
export const text=`**Charger les données issues des observations**
Pour charger et analyser les données photométriques d’un amas que vous
venez d’acquérir avec le télescope et le photomètre, choisissez
« Fichier » (File)->« Charger/tracer » (Load/Plot)->« Données issues
des observations » (Data from Observations) dans le menu de l’outil
d’analyse du diagramme HR. Le diagramme couleur-magnitude (HR) brut
apparaîtra une fois les données chargées. Si vous avez enregistré des
données photométriques lors d’une session précédente, rechargez-les
avant d’y accéder de cette manière.

Rubriques connexes :
    Rubriques sous « Outils d’analyse d’amas »
    Rubriques d’aide « Éditeurs de résultats » et « Charger les données
      enregistrées » du menu du panneau de commande de l’observatoire.

**Charger les données de la base de données d’amas**
Pour charger et analyser les données photométriques d’amas individuels
de la base de données de VIREO, choisissez « Fichier » (File)->
« Charger/tracer » (Load/Plot)->« Sélectionner les données d’amas »
(Select Cluster Data) dans le menu de l’outil d’analyse du diagramme
HR. Dans la liste qui apparaît, cliquez sur une entrée pour la
sélectionner, puis choisissez « Sélection » (Selection)->« Tracer »
(Plot) dans le menu. Vous pouvez aussi double-cliquer sur une entrée de
la liste pour charger et tracer les données.

Rubriques connexes :
    Rubriques sous « Outils d’analyse d’amas »
    Charger un nouvel amas de la base de données

**Charger un nouvel amas de la base de données**
Le chargement d’un nouvel amas de la base de données remplacera les
points de données de l’affichage du diagramme HR. Si la ZAMS et/ou une
isochrone sont affichées, elles ne seront pas retirées automatiquement.

Rubriques connexes :
    Charger les données de la base de données d’amas
    Retirer la ZAMS et l’isochrone de l’affichage

**Afficher la séquence principale d’âge zéro**
Ajuster la séquence principale d’âge zéro (ZAMS) aux données de l’amas
vous permettra de déterminer le module de distance V-Mv et l’excès de
couleur E(B-V) de l’amas. Pour afficher la ZAMS, choisissez « Outils »
(Tools)->« Séquence principale d’âge zéro » (Zero Age Main Sequence)
dans le menu de l’outil d’analyse du diagramme HR. La ZAMS s’affichera
d’abord avec V-Mv = 0.

Rubriques connexes :
    Ajuster la séquence principale d’âge zéro
    Retirer la ZAMS et l’isochrone de l’affichage

**Ajuster la séquence principale d’âge zéro**
Utilisez le curseur de réglage de V-Mv, sur le côté droit du tracé du
diagramme HR, pour ajuster la ZAMS à la séquence principale que montre
le tracé de l’amas. Gardez à l’esprit que la partie supérieure de la
séquence principale de l’amas se sera éloignée de la séquence
principale d’âge zéro au cours de son évolution. L’ampleur de cet écart
dépendra de l’âge de l’amas. (Ajuster une isochrone après avoir placé
la ZAMS le rendra plus clair.) Le diagramme HR de l’amas comportera
aussi des étoiles qui ne sont pas membres de l’amas, mais dans la
plupart des cas la séquence principale de l’amas est assez bien
délimitée pour permettre un ajustement relativement précis de la ZAMS.

Le curseur situé au bas du tracé déplace la ZAMS latéralement en
appliquant un excès de couleur E(B-V) pour compenser l’effet de
rougissement dû à la poussière interstellaire entre l’amas et le
Soleil. Pour simplifier l’ajustement, le logiciel fixe par défaut
automatiquement E(B-V) à la valeur correcte pour l’amas que vous
étudiez, et vous n’avez pas besoin de la modifier. Votre enseignant
vous indiquera si cette valeur par défaut a été modifiée et si vous
devez envisager d’ajuster E(B-V) lorsque vous ajustez la ZAMS.

Rubriques connexes :
    Afficher la séquence principale d’âge zéro
    Ajouter l’isochrone à l’affichage
    Retirer la ZAMS et l’isochrone de l’affichage

**Ajouter l’isochrone à l’affichage**
Ajuster la bonne isochrone aux données de l’amas vous indiquera l’âge de
l’amas et la métallicité de ses étoiles. L’affichage de l’isochrone
utilise l’ajustement de la séquence principale d’âge zéro pour
« ancrer » les paramètres V-Mv et E(B-V) : vous devez donc d’abord
ajuster la ZAMS avant d’ajouter une isochrone. Quand c’est fait, ajoutez
l’affichage de l’isochrone en choisissant « Outils » (Tools)->
« Isochrones... » dans le menu. La boîte de commande « Paramètres de
l’isochrone » (Isochrone Parameters) qui apparaît vous permettra
d’ajuster l’isochrone aux données de l’amas. (Lorsqu’une isochrone est
affichée, toute modification des curseurs de l’affichage du diagramme HR
qui commandent les valeurs de V-Mv et de E(B-V) déplacera ensemble la
ZAMS et l’isochrone.)

REMARQUE : les isochrones sont obtenues à partir de modèles théoriques
fournis pour les valeurs précises d’âge et de métallicité couvertes par
les commandes. Les valeurs intermédiaires ne sont pas disponibles, et
un ajustement exact à un amas donné n’est pas toujours possible. La
partie inférieure de la séquence principale de l’isochrone peut ne pas
coïncider exactement avec la ZAMS. Vous devriez chercher à obtenir une
bonne correspondance avec la séquence principale juste en dessous du
point de retournement de la séquence principale (turn-off), avec ce
point lui-même, et avec les parties évoluées du diagramme situées
au-dessus et à droite du point de retournement.

Rubriques connexes :
    Ajuster la séquence principale d’âge zéro
    Ajuster l’âge de l’isochrone
    Définir la métallicité de l’isochrone
    Ajuster la couleur de l’isochrone
    Retirer la ZAMS et l’isochrone de l’affichage

**Ajuster l’âge de l’isochrone**
Utilisez le curseur situé en haut de la boîte de commande « Paramètres
de l’isochrone » (Isochrone Parameters) pour ajuster l’âge de
l’isochrone affichée. Le curseur règle le logarithme de l’âge en années
de 7.80 à 10.25, par pas de 0.05. Cela correspond à des âges d’amas
allant de 63 millions à près de 18 milliards d’années. (Voir la
REMARQUE sous « Ajouter l’isochrone à l’affichage ».) Il se peut que
l’âge de l’amas que vous étudiez soit en dehors de la plage des
isochrones disponibles. Dans ce cas, vous concluriez que l’âge de
l’amas est inférieur ou supérieur à la limite applicable.

Rubriques connexes :
    Ajouter l’isochrone à l’affichage
    Définir la métallicité de l’isochrone
    Ajuster la couleur de l’isochrone
    Retirer la ZAMS et l’isochrone de l’affichage

**Définir la métallicité de l’isochrone**
Des modèles d’isochrones sont fournis pour 6 valeurs de métallicité.
(Voir la REMARQUE sous « Ajouter l’isochrone à l’affichage ».) En plus
de la valeur solaire, 4 modèles de métallicité inférieure et 1 de
métallicité supérieure sont disponibles. La plupart des amas ouverts de
la Galaxie ont des métallicités proches de la valeur solaire, et vous
devez toujours commencer par celle-ci. Si vous n’obtenez pas de
correspondance satisfaisante, vous pouvez essayer de changer la
métallicité. (Vous pouvez aussi essayer plusieurs valeurs pour voir
l’effet qu’elles ont.) Dans la boîte de commande « Paramètres de
l’isochrone » (Isochrone Parameters), utilisez les petits boutons
fléchés au bord droit de l’affichage de la métallicité pour faire
défiler les différentes valeurs. Pour changer la métallicité de
l’isochrone affichée, réglez dans la boîte le modèle voulu, puis
double-cliquez dessus.

Rubriques connexes :
    Ajouter l’isochrone à l’affichage
    Ajuster la couleur de l’isochrone

**Ajuster la couleur de l’isochrone**
Le curseur « Ajuster (B-V) » (Adjust (B-V)) de la boîte de commande
« Paramètres de l’isochrone » (Isochrone Parameters) déplace
l’isochrone latéralement sur le diagramme HR sans déplacer la ZAMS.
Cela peut vous permettre d’obtenir un meilleur ajustement, surtout si
vous avez du mal à faire coïncider la séquence principale de
l’isochrone avec la ZAMS. (Vous pouvez aussi essayer de modifier la
métallicité pour corriger cela.) Dans une certaine mesure, le réglage
de (B-V) imite l’effet de variations de métallicité plus petites que
les différences entre les modèles.

Rubriques connexes :
    Ajouter l’isochrone à l’affichage
    Définir la métallicité de l’isochrone

**Retirer la ZAMS et l’isochrone de l’affichage**
Choisissez « Outils » (Tools)->« Effacer » (Clear) dans le menu de
l’outil d’analyse du diagramme HR pour retirer de l’affichage à la fois
la ZAMS et l’isochrone. Vous pouvez aussi les retirer séparément en
choisissant de nouveau l’option de menu correspondante (« Outils »->
« Séquence principale d’âge zéro » ou « Outils »->« Isochrones... »).
C’est sans doute surtout utile pour retirer l’isochrone tout en
conservant la ZAMS, surtout après le chargement d’un nouvel amas.

Rubriques connexes :
    Charger un nouvel amas de la base de données

**Afficher/imprimer les paramètres d’âge et de distance de l’amas**
Choisissez « Outils » (Tools)->« Voir/imprimer les paramètres »
(View/Print Parameters) dans le menu de l’outil d’analyse du diagramme
HR pour obtenir un affichage des valeurs des paramètres issues de votre
analyse du diagramme HR de l’amas. Choisissez « Liste » (List)->
« Imprimer » (Print) pour obtenir une copie imprimée.
`;
