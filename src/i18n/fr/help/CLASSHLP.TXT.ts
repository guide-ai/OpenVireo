// Front FR-HELP [W]: OpenVireo's French (fr) web adaptation of VIREO's CLASSHLP.TXT. Not CLEA's text: the original bytes, hashes and
// provenance are unchanged (public/original). Loaded only by the help viewer, never with the main French chunk.
export const language='fr';
export const sourceName='CLASSHLP.TXT';
export const sourceSha256='9a3a70c11f5cfc024552e6b70db59953b16f40cafeea09a8d06974859a26a3b7';
export const text=`**Charger un spectre**
Pour charger un spectre à classer :

    1)  Choisissez « Fichier » (File)->« Spectres inconnus » (Unknown
        Spectra) dans le menu de la fenêtre de classification.

    2)  Faites un choix dans le sous-menu qui apparaît :

        « Spectres enregistrés (*.CSP...) » (Saved Spectra (*.CSP...))
            Choisissez dans une liste de spectres obtenus et enregistrés
            pour être classés dans le cadre de ce TP. Pour choisir,
            double-cliquez sur le nom du fichier ou placez le curseur
            sur le nom du fichier et appuyez sur « Ouvrir » (Open).

        « Liste du programme » (Program List)
            Choisissez dans une liste d’étoiles du programme de ce TP.
            Vous commencerez normalement par la première étoile de la
            liste. Pour choisir une étoile de la liste, double-cliquez
            sur l’identifiant de l’étoile ou placez le curseur sur
            l’étoile voulue et choisissez « Fichier »->« Ouvrir la
            sélection » (Open Selection) dans le menu.

        « Suivant dans la liste » (Next On List)
            Charge le spectre suivant de la liste du programme sans
            afficher la liste. (« Liste du programme » doit avoir été
            choisie auparavant.)

Le spectre choisi est chargé et affiché au centre de la zone
d’affichage des spectres.

**Charger des spectres étalons**
Pour charger des spectres étalons à des fins de comparaison :

    1)  Choisissez « Fichier » (File)->« Atlas de spectres
        étalons... » (Atlas of Standard Spectra...) dans le menu de
        la fenêtre de classification.

    2)  Choisissez un atlas dans la liste qui apparaît. Vous
        commencerez normalement par la séquence principale afin
        d’établir une classe de température avant de considérer la
        luminosité. Pour choisir, double-cliquez sur la description de
        l’atlas ou placez le curseur sur l’atlas voulu et choisissez
        « Fichier »->« Ouvrir la sélection » (Open Selection) dans le
        menu.

    3)  La liste des étalons de l’atlas apparaît dans l’affichage
        bleu-vert « Étalons » (Standards), à droite de la fenêtre de
        classification. Notez que le spectre en surbrillance est
        affiché au-dessus de l’inconnu dans la zone d’affichage, tandis
        que l’entrée suivante de l’atlas est affichée sous l’inconnu.

    4)  Utilisez les touches fléchées ou cliquez sur les entrées de la
        liste des étalons pour parcourir l’atlas. Observez les
        changements progressifs des spectres à mesure que la
        température stellaire varie. Cherchez dans l’atlas le spectre
        qui ressemble le plus à l’inconnu. Il vous faudra peut-être
        vérifier la luminosité (charger un autre atlas) pour obtenir la
        meilleure correspondance.

**Mesurer et marquer les caractéristiques spectrales**
Pour mesurer la longueur d’onde et l’intensité d’une caractéristique
spectrale :

    Le curseur placé sur l’affichage du spectre, maintenez enfoncé le
    bouton gauche de la souris : le curseur passe d’une flèche à un
    réticule. Lorsque vous déplacez le curseur dans la zone d’affichage
    du spectre, la longueur d’onde et l’intensité relative lues au
    curseur s’affichent au bas de la fenêtre. Quand vous avez placé le
    curseur sur le point à mesurer, relâchez le bouton de la souris. Les
    lectures restent inchangées jusqu’à ce que vous appuyiez de nouveau
    sur le bouton gauche de la souris.

        REMARQUE : si le spectre est affiché sous forme de tracé
        d’intensité (voir la rubrique d’aide « Configurer
        l’affichage »), c’est la position verticale (coordonnée Y) du
        curseur qui détermine la mesure d’intensité. Si l’affichage est
        en mode « Photo », c’est l’intensité « sous » le
        curseur (à la coordonnée horizontale, ou X) qui est affichée.

    Lorsque vous relâchez le bouton de la souris, le curseur retrouve sa
    forme normale et la position mesurée est marquée à l’écran par une
    ligne rouge verticale, qui traverse le spectre inconnu et les
    spectres étalons à la position de la longueur d’onde. Une petite
    ligne horizontale indique la position de l’intensité. Vous pouvez
    aussi marquer une raie en double-cliquant sur son entrée dans le
    tableau des raies spectrales. Vous pouvez « affiner » la position
    des lignes à l’aide des touches fléchées du pavé numérique (voir
    ci-dessous).

    -Accès au clavier-
    Les touches fléchées du pavé numérique (touches « 2 », « 4 », « 6 »,
    « 8 ») peuvent servir à positionner les lignes de mesure à la place
    de la souris. « Verr Num » doit être activé et « Touches souris »
    (MouseKeys) désactivées. (Si vous utilisez « Touches souris »,
    configurez votre système pour qu’elles soient activées lorsque
    « Verr Num » est désactivé.) Si les lignes de mesure ne sont pas
    visibles, appuyez sur la touche fléchée droite (« 6 ») : les lignes
    apparaîtront depuis la gauche de l’affichage.

Rubriques connexes :
    Tableau des raies spectrales et aide
    Configurer l’affichage

**Commandes**
Les commandes suivantes se trouvent sur le côté droit de la fenêtre de
classification :

    Zoom avant (pointe de flèche vers le haut) :
        Agrandit les spectres affichés d’un facteur 2, jusqu’à un
        maximum de 16 fois l’affichage d’origine. Si une caractéristique
        est marquée, le zoom tente de la centrer dans l’affichage
        agrandi. Si aucune raie n’est marquée, la longueur d’onde du
        centre de l’affichage reste la même.

    Zoom arrière (pointe de flèche vers le bas) :
        Réduit l’agrandissement des spectres affichés d’un facteur 2,
        jusqu’à l’agrandissement d’origine (1X). Si une raie est
        marquée, le zoom tente de la garder centrée dans l’affichage.

    Flèches de défilement (pointes de flèche gauche et droite) :
        Utilisez les flèches gauche et droite pour parcourir les
        spectres agrandis.

    Bouton « Réinitialiser » (Reset) :
        Ramène l’affichage aux images d’origine (1X).

**Tableau des raies spectrales et aide**
Le tableau des raies spectrales aide à identifier les caractéristiques
spectrales par longueur d’onde ; il comprend une fonction d’aide qui
renseigne sur la signification et l’usage de chaque raie du tableau
pour la classification des spectres stellaires.

Pour charger le tableau des raies spectrales, choisissez « Fichier »
(File)->« Tableau des raies spectrales » (Spectral Line Table) dans le
menu de classification. Une fois le tableau affiché, vous pouvez le
déplacer à l’endroit de l’écran qui vous convient. (Placez le curseur
dans la barre de titre en haut. Maintenez enfoncé le bouton gauche de
la souris et faites glisser la fenêtre.)

Fonctions du tableau des raies spectrales :

    -Suivi du curseur-
        Lorsque le bouton gauche de la souris est enfoncé, le curseur
        se trouvant n’importe où dans l’affichage du spectre, l’entrée
        dont la longueur d’onde est la plus proche de la position du
        curseur est mise en surbrillance dans le tableau des raies
        spectrales. Le tableau défile pour suivre le curseur lorsque la
        souris est déplacée avec le bouton gauche enfoncé.

            ATTENTION : il faut faire preuve de discernement avant
            d’accepter les identifications de raies du tableau, car la
            longueur d’onde en est le seul critère : la température, la
            luminosité, etc. ne sont pas prises en compte. Par exemple,
            les raies du fer (Fe) n’apparaissent pas dans les étoiles
            de type précoce, les raies de l’hélium (He) n’apparaissent
            pas dans les étoiles de type tardif, etc.

    -Marquage de la position d’une raie-
        Un clic du bouton gauche de la souris sur une entrée du tableau
        des raies spectrales met l’entrée en surbrillance et marque la
        position de la raie dans l’affichage du spectre.

    -Aide-
        Lorsque vous double-cliquez avec le bouton gauche de la souris
        sur une entrée du tableau des raies spectrales, l’entrée est
        mise en surbrillance, la raie est marquée comme ci-dessus et une
        fenêtre d’aide apparaît avec des informations sur la raie
        choisie. Une fois ouverte, la fenêtre d’aide continue de
        « suivre » les sélections du tableau (sans double-clic)
        jusqu’à sa fermeture.

Rubriques connexes :
    Mesurer et marquer les caractéristiques spectrales

**Configurer l’affichage**
Les options qui modifient l’apparence et le fonctionnement de la
fenêtre de classification sont accessibles par la sélection
« Fichier »->« Affichage » (Display).

    « Fichier »->« Affichage »
        Définit le format de l’affichage du spectre. Les options
        suivantes sont disponibles :

        « Afficher la différence (étalon - inconnu) » (Show Difference
        (Std - Unkn))
            Lorsque cette option est choisie, le spectre étalon du
            bas est remplacé par un affichage de la différence point
            par point entre le spectre étalon du haut et l’inconnu.
            C’est une aide très utile pour la classification
            spectrale.

        « Tracé d’intensité » (Intensity Trace)
            Affiche les spectres sous forme de tracés de l’intensité
            relative en fonction de la longueur d’onde (par défaut).

        « Photo en niveaux de gris »
            Convertit les intensités relatives en niveaux de gris pour
            imiter une image photographique (positive).

        « Comb. (Photo et tracé) » (Comb. (Photo & Trace))
            Affiche l’inconnu dans les deux modes. Un spectre étalon
            est affiché comme une « photo ».

        « Inverser les niveaux de gris photographiques » (Reverse
        Grayscale Displays)
            Inverse la conversion des intensités en niveaux de gris
            pour imiter une image photographique négative.


**Mesurer les largeurs équivalentes**
La « largeur équivalente » d’une raie spectrale est une grandeur
calculée qui mesure avec précision l’intensité de la raie. Si vous
tentez de classer très précisément un spectre stellaire et que vous
avez des doutes sur l’intensité relative de caractéristiques
importantes, la mesure de la largeur équivalente peut vous aider. Pour
mesurer la largeur équivalente d’une caractéristique spectrale :

    1)  Agrandissez l’affichage à un grossissement qui permette de
        repérer et de marquer clairement les « épaules » de la raie.

    2)  Choisissez « Largeur équivalente d’une raie... » (Line
        Equivalent Width...) dans le menu de classification. Une boîte
        apparaît avec les instructions pour mener à bien le calcul de
        la largeur équivalente (un résumé des étapes 3 à 5 ci-dessous).

    3)  Marquez le centre approximatif de la raie dans l’affichage du
        spectre en utilisant le bouton gauche de la souris, soit sur
        l’affichage lui-même, soit sur l’entrée de la raie dans le
        tableau.

    4)  Marquez la longueur d’onde et l’intensité des deux épaules de
        la raie en cliquant avec le bouton droit de la souris, le
        curseur placé tour à tour sur chaque épaule. La position
        verticale du curseur doit indiquer le niveau du continuum de
        chaque côté de la raie. Si vous avez bien procédé, l’étendue de
        la raie sera délimitée par un cadre bleu, le repère rouge de la
        position de la raie passant quelque part près de son centre. Si
        vous souhaitez modifier une position, placez simplement le
        curseur sur la nouvelle position et cliquez de nouveau avec le
        bouton droit. Vous pouvez aussi repositionner le repère du
        centre de la raie en cliquant avec le bouton gauche.

    5)  Lorsque la caractéristique est correctement délimitée, appuyez
        sur « OK » dans la boîte d’instructions. La largeur équivalente
        calculée s’affiche, ainsi que les longueurs d’onde et les
        intensités au centre de la raie marqué et aux épaules.

Rubriques connexes :
    Mesurer et marquer les caractéristiques spectrales
    Tableau des raies spectrales et aide

**Enregistrer, revoir et analyser les résultats**
Lorsque vous avez classé un spectre à votre satisfaction, choisissez
« Résultats de classification » (Classification Results) dans le menu
et consignez votre classification dans la case « Type sp. » (Sp. Type)
du formulaire qui apparaît. Vous pouvez aussi consigner toute
incertitude ou toute particularité du spectre dans la case
« Remarques » (Remarks). Quand vous appuyez sur « OK », les
informations saisies sont placées dans une liste, mais ne sont pas
enregistrées dans un fichier. Pour revoir, imprimer ou enregistrer vos
résultats dans un fichier, choisissez « Outils » (Tools)->« Éditeurs de
résultats » (Results Editors)->« Résultats d’observation »
(Observational Results)->« Afficher/imprimer/enregistrer »
(Display/Print/Save) dans le menu du panneau de commande de
l’observatoire.

Rubriques connexes :
    « Éditeurs de résultats » dans le menu « Aide » du panneau de
    commande de l’observatoire.

**Définir la plage de longueurs d’onde**
Vous pouvez modifier la plage de longueurs d’onde visible dans la
fenêtre de classification, dans la limite d’une plage maximale de 3500
à 7400 angströms. Pour modifier la plage de longueurs d’onde, choisissez
« Fichier »->« Affichage »->« Plage spectrale » (Spectral Range) dans
le menu du panneau de commande de classification. Utilisez les curseurs
pour modifier les valeurs minimale et/ou maximale. Le bouton
« Par défaut » (Default) ramène les valeurs à la plage optimale pour la
classification spectrale. Notez que si vous étendez la plage, vous
risquez de dépasser les limites du spectre que vous classez.

**Fermer la fenêtre de classification**
Pour fermer la fenêtre de classification et revenir au panneau de
commande de l’observatoire, choisissez « Fichier »->« Quitter Classer
les spectres » (Exit Classify Spectra) dans le menu, ou appuyez sur la
case « X » dans le coin supérieur droit.
`;
