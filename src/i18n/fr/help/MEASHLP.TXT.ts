// Front FR-HELP [W]: OpenVireo's French (fr) web adaptation of VIREO's MEASHLP.TXT. Not CLEA's text: the original bytes, hashes and
// provenance are unchanged (public/original). Loaded only by the help viewer, never with the main French chunk.
export const language='fr';
export const sourceName='MEASHLP.TXT';
export const sourceSha256='e9f20545e1ff580439f45af3fd2e9aff0b64b1cd4edab467d07e8de1813577ac';
export const text=`**Charger un spectre pour la mesure**
Pour charger un spectre à mesurer, choisissez « Fichier » (File)->
« Données » (Data)->« Charger un spectre enregistré... » (Load Saved
Spectrum...) dans le menu de l’outil de mesure, puis choisissez le
fichier de spectre à charger.

Rubriques connexes :
    « Enregistrer le spectre pour l’analyse » dans le menu « Aide »
    (Help) du spectromètre.

**Mesurer des caractéristiques spectrales individuelles**
Vous pouvez mesurer la position et l’intensité relative de
caractéristiques spectrales individuelles sur un spectre affiché.
Maintenez enfoncé le bouton gauche de la souris tout en plaçant le
curseur en croix sur la caractéristique à mesurer. La position du
curseur s’affiche dans des affichages au bas de l’écran, convertie en
longueur d’onde et en intensité relative. Quand vous relâchez le bouton
de la souris, une ligne verticale apparaît à l’écran à la position de
la longueur d’onde et une courte ligne horizontale apparaît au niveau
de l’intensité. Vous pouvez ajuster la position de ces lignes avec les
touches fléchées du pavé numérique pour améliorer vos mesures avant de
les consigner. Vous pouvez aussi déplacer les lignes vers la
caractéristique suivante à mesurer en maintenant une touche fléchée
enfoncée (voir ci-dessous).

    -Accès au clavier-
    Les touches fléchées du pavé numérique (touches « 2 », « 4 », « 6 »,
    « 8 ») peuvent servir à positionner les lignes de mesure à la place
    de la souris. « Verr Num » doit être activé et « Touches souris »
    (MouseKeys) désactivé. (Si vous utilisez « Touches souris »,
    configurez votre système pour qu’elles soient activées lorsque
    « Verr Num » est désactivé.) Si les lignes de mesure ne sont pas
    visibles, appuyez sur la touche fléchée droite (« 6 ») : les lignes
    apparaîtront depuis la gauche de l’affichage.

Voir aussi :
    Charger un spectre de comparaison
    Mesurer avec un spectre de comparaison
    Consigner les mesures

**Charger un spectre de comparaison**
Pour charger un spectre de comparaison, choisissez « Spectre de
comparaison » (Comparison Spectrum)->« Sélectionner » (Select) dans le
menu de l’outil de mesure, puis choisissez un ensemble de raies dans la
liste qui apparaît. Les raies de comparaison apparaissent à l’affichage
et le contrôle du curseur est activé. Vous pouvez charger autant
d’ensembles de raies que vous le souhaitez. Toutes les raies choisies
restent affichées jusqu’à ce que le spectre de comparaison soit effacé.

Voir aussi :
    Mesurer avec un spectre de comparaison
    Identifier les raies de comparaison
    Effacer le spectre de comparaison

**Mesurer avec un spectre de comparaison**
Vous pouvez mesurer le décalage Doppler d’un spectre par rapport à un
spectre de comparaison comportant de nombreuses raies. Chargez
simplement un spectre de comparaison (notez que plusieurs ensembles de
raies peuvent être chargés) et utilisez le curseur pour déplacer la
comparaison jusqu’à ce qu’elle coïncide avec les raies spectrales du
spectre de l’objet. La valeur de z correspondant au décalage du spectre
de comparaison s’affiche sous le curseur. Notez ce qui suit :

    1)  Vous n’obtiendrez peut-être pas un ajustement exact sur chaque
        raie. Il vous faudra juger vous-même du meilleur ajustement
        d’ensemble.

    2)  Vos mesures seront plus précises si vous agrandissez le
        spectre. Cela peut toutefois rendre impossible de voir toutes
        les raies en même temps. (Voir les rubriques d’aide indiquées
        ci-dessous.)

    3)  Vous trouverez peut-être plus précis de mesurer les raies une
        à une. (Voir la rubrique d’aide « Mesurer des caractéristiques
        spectrales individuelles ».) Vous pouvez utiliser le spectre de
        comparaison pour identifier les raies, mais vous devrez
        consigner vos résultats et calculer un z moyen hors du
        programme. Quelle que soit la valeur qui apparaît dans
        l’affichage de z, elle ne sera pas valide.

Voir aussi :
    Charger un spectre de comparaison
    Identifier les raies de comparaison
    Effacer le spectre de comparaison
    Zoom et défilement du spectre
    Régler la sensibilité du curseur
    Recentrer le curseur
    Consigner les mesures
    Caractéristiques spectrales individuelles

**Identifier les raies de comparaison**
Pour identifier une raie du spectre de comparaison, placez le curseur
de la souris près de la raie dans l’affichage et appuyez sur le bouton
droit de la souris. La boîte qui apparaît indique l’identifiant de la
raie, les longueurs d’onde au repos et décalée, et la catégorie de la
source de la raie.

Voir aussi :
    Charger un spectre de comparaison
    Mesurer avec un spectre de comparaison

**Effacer le spectre de comparaison**
Pour effacer le spectre de comparaison de l’affichage, choisissez
« Spectre de comparaison » (Comparison Spectrum)->« Effacer » (Clear)
dans le menu de l’outil de mesure. Toutes les raies de comparaison sont
retirées de l’affichage.

**Consigner les mesures**
Pour consigner la valeur de z que vous avez mesurée, choisissez
« Fichier » (File)->« Données » (Data)->« Consigner les mesures... »
(Record Measurements...) Si vous avez mesuré avec le curseur du spectre
de comparaison, la valeur de z de l’affichage est déjà saisie dans le
formulaire. Si vous mesurez les raies une à une, la valeur saisie ne
sera pas correcte et vous devrez la remplacer par votre valeur moyenne
calculée.

Lorsque vous appuyez sur « OK », les informations saisies sont placées
dans une liste, mais ne sont pas enregistrées dans un fichier. Pour
revoir, imprimer ou enregistrer vos résultats dans un fichier,
choisissez « Outils » (Tools)->« Éditeurs de résultats » (Results
Editors)->« Résultats d’observation » (Observational Results)->
« Afficher/imprimer/enregistrer... » (Display/Print/Save...) dans le
menu du panneau de commande de l’observatoire.

Voir aussi :
    Mesurer avec un spectre de comparaison
    Mesurer des caractéristiques spectrales individuelles
    « Éditeurs de résultats » dans le menu « Aide » du panneau de
    commande de l’observatoire.

**Zoom et défilement du spectre**
Pour agrandir un spectre que vous mesurez, appuyez sur le bouton
« Zoom ». Une boîte avec des curseurs apparaît ; elle permet de
définir la plage de longueurs d’onde affichée dans la fenêtre de
mesure. Les curseurs modifient les longueurs d’onde par pas de 100
angströms. Le bouton « Réinitialiser » (Reset) ramène l’affichage à la
plage de longueurs d’onde d’origine (complète).

Quand l’affichage est agrandi, les flèches de défilement situées sous
le bouton de zoom sont activées. Utilisez-les pour modifier la partie
visible du spectre. Comme les curseurs, elles opèrent par pas de 100
angströms.

Agrandir le spectre permet de déterminer z plus précisément, car la
pixellisation plus fine donne un pas plus petit dans le placement de la
ligne de mesure et/ou du spectre de comparaison. L’inconvénient,
lorsqu’on mesure avec un spectre de comparaison, est que toutes les
raies ne sont peut-être pas visibles en même temps pour déterminer le
meilleur ajustement d’ensemble.

Rubriques connexes :
    Mesurer avec un spectre de comparaison
    Mesurer les raies spectrales individuelles

**Régler la sensibilité du curseur**
L’interrupteur « Fin » (Fine)/« Grossier » (Coarse) situé au-dessus du
curseur du spectre de comparaison règle la sensibilité du curseur.
Utilisez le réglage « Grossier » seulement lorsque vous devez déplacer
le spectre de comparaison sur une longue distance.

Rubriques connexes :
    Recentrer le curseur
    Mesurer avec un spectre de comparaison

**Recentrer le curseur**
Si vous atteignez l’extrémité du curseur du spectre de comparaison et
devez déplacer davantage le spectre de comparaison, appuyez sur le
petit bouton à droite de l’affichage de z pour recentrer le curseur.

Rubriques connexes :
    Régler la sensibilité du curseur
    Mesurer avec un spectre de comparaison

**Fermer la fenêtre de mesure**
Pour fermer la fenêtre de l’outil de mesure et revenir au panneau de
commande de l’observatoire, choisissez « Fichier » (File)->« Quitter
la mesure des spectres » (Exit Spectrum Measuring) dans le menu, ou
appuyez sur la case « X » dans le coin supérieur droit.
`;
