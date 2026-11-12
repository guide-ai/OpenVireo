// Front FR-HELP [W]: OpenVireo's French (fr) web adaptation of VIREO's CAMHLP.TXT. Not CLEA's text: the original bytes,
// hashes and provenance are unchanged (public/original). Loaded only by the help viewer, never with the main French chunk.
export const language='fr';
export const sourceName='CAMHLP.TXT';
export const sourceSha256='bf4976da1b1f976613646e10c954b95039e646f3362004cafb242da4572155b8';
export const text=`**Définir la pose**
Pour régler la pose de la caméra :

    1)  Saisissez une valeur (entière ou décimale) dans la case « Pose »
        (Exposure).

    2)  Placez l’interrupteur à curseur sur « Secondes » (Seconds) ou
        « Minutes », selon le cas.

Rubriques connexes :
    Faire une pose

**Définir le filtre**
Utilisez l’interrupteur à curseur du filtre pour régler le filtre de
la caméra. La position marquée « NF » signifie « sans filtre » (no
filter).

    REMARQUE : en raison des contraintes de taille du fichier de
    données, seul le filtre « J » est disponible sur la caméra
    infrarouge (IR). Le curseur n’ira pas sur les positions « H » et
    « K ».

Rubriques connexes :
    Faire une pose

**Définir le gain**
Le « gain » est le nombre d’« impacts » de photons (électrons)
sur un pixel du CCD nécessaires pour compter comme 1 unité
dans l’image enregistrée. Vous pouvez régler le gain avec
l’interrupteur à curseur marqué « Gain ». Normalement, vous pouvez
laisser le gain à 1, sauf indication contraire de votre enseignant.

Rubriques connexes :
    Faire une pose

**Faire une pose**
Pour faire une pose avec les caméras CCD et IR :

    1)  Réglez le temps de pose. Un temps de pose de 1 à 2 minutes
        devrait suffire pour la plupart des activités.

    2)  Réglez le filtre. Sauf indication contraire précise, utilisez
        la position « NF » (sans filtre) pour les images CCD et le
        filtre « J » pour les images IR.

    3)  Laissez le réglage du gain à 1, sauf indication contraire.

    4)  Appuyez sur le bouton « Démarrer » (Start). La caméra procède à
        une initialisation, puis ouvre l’obturateur pour commencer la
        pose. Les affichages « État de la caméra » (Camera Status) et
        « Minuteur de pose » (Exposure Timer) suivent la progression de
        la pose. Quand le temps de pose indiqué est atteint,
        l’obturateur se ferme et l’image que vous venez de prendre
        apparaît dans l’affichage. (Vous n’avez pas besoin d’utiliser
        le bouton « Arrêter » (Stop), sauf si vous voulez interrompre
        la pose parce que vous avez fait une erreur, par exemple en
        réglant une pose de 90 minutes alors que vous vouliez 90
        secondes.)

    5)  Si l’image est satisfaisante (le champ et la pose sont
        corrects), enregistrez-la pour l’analyser.

Rubriques connexes :
    Définir la pose
    Définir le filtre
    Définir le gain
    Affichage de l’image
    Enregistrer l’image

**Enregistrer l’image**
Pour enregistrer une image que vous venez de prendre, choisissez
« Fichier » (File)->« Enregistrer l’image » (Save Image) dans le menu du
panneau de commande de la caméra. Le système créera un nom de fichier,
généralement fondé sur l’identifiant de l’objet le plus proche du
centre du champ. Vous voudrez peut-être le remplacer par un nom lié
au TP que vous faites, ou plus parlant pour vous. Les images sont
enregistrées au format FITS (extension de fichier par défaut
« .FIT »).

    REMARQUE : si vous fermez la fenêtre de commande de la caméra ou
    commencez une nouvelle pose sans avoir enregistré l’image
    précédente, elle sera perdue. Vous en serez averti si vous tentez
    de le faire.

Rubriques connexes :
    Analyser les images

**Analyser les images**
Les modules de VIREO disponibles pour visualiser et analyser les
images CCD comprennent le module d’astrométrie et le module de
traitement d’images (DS9). Après avoir pris et enregistré toutes les
images requises, choisissez « Outils » (Tools)->(module) dans le menu
du panneau de commande de l’observatoire, puis chargez les images. Le
module d’analyse devrait accéder au bon répertoire ; n’oubliez pas que
l’extension de fichier est « .FIT ».

Rubriques connexes :
    Rubriques sous « Outils » dans le menu « Aide » du panneau de
    commande de l’observatoire.

**Paramètres de la caméra**
Pour accéder aux informations et aux paramètres du détecteur CCD que
vous utilisez, choisissez « Fichier » (File)->« Informations... »
(Information...) dans le menu du panneau de commande de la caméra.

**Affichage de l’image**

**Fermer la caméra CCD**
Pour fermer le panneau de commande de la caméra CCD et retourner au
panneau de commande du télescope, choisissez « Fichier » (File)->
« Quitter la caméra CCD » (Exit CCD Camera) dans le menu, ou utilisez
la case « X » en haut à droite. Si vous n’avez pas enregistré la
dernière image que vous avez prise, vous serez averti et vous aurez la
possibilité de l’enregistrer. Si vous fermez la caméra sans enregistrer
l’image, elle sera perdue.

Rubriques connexes :
    Enregistrer l’image
`;
