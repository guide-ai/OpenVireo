// Front FR-HELP [W]: OpenVireo's French (fr) web adaptation of VIREO's PHOTOHLP.TXT. Not CLEA's text: the original bytes,
// hashes and provenance are unchanged (public/original). Loaded only by the help viewer, never with the main French chunk.
export const language='fr';
export const sourceName='PHOTOHLP.TXT';
export const sourceSha256='aaf7f6827f418cf1aa1e2da70185b96ecf96ffd919899d84547a8695afa42d8a';
export const text=`**Définir le filtre**
Utilisez le curseur « Filtre » (Filter) du panneau de commande du
photomètre pour régler le filtre actif. Vous devez faire une lecture
du ciel avec chaque filtre avant de pouvoir l’utiliser pour mesurer des
magnitudes stellaires.

Rubriques connexes :
    Faire des lectures du ciel
    Interrupteurs à curseur

**Définir la durée d’intégration**
Utilisez le curseur « Secondes » (Seconds) du panneau de commande du
photomètre pour régler la durée de chaque intégration (le temps
pendant lequel les comptages de photons s’accumulent quand on fait une
lecture). Les choix vont de 0.1 seconde à 100 secondes, par facteurs
de 10.

Rubriques connexes :
    Définir le nombre d’intégrations
    Faire des lectures photométriques
    Interrupteurs à curseur

**Définir le nombre d’intégrations**
Utilisez le curseur « Intégrations » (Integrations) du panneau de
commande du photomètre pour régler le nombre d’intégrations qui
forment une lecture complète. Les choix vont de 1 à 5.

Rubriques connexes :
    Définir la durée d’intégration
    Faire des lectures photométriques
    Interrupteurs à curseur

**Définir la taille de l’ouverture**
Pour régler la taille de l’ouverture du photomètre, choisissez
« Ouverture » (Aperture) dans le menu du panneau de commande du
photomètre. Une petite boîte de commande apparaît, avec un curseur qui
permet de changer la taille de l’ouverture. Le bouton « Par défaut »
(Default) ramène l’ouverture à sa taille par défaut. Vous devriez
utiliser la taille d’ouverture par défaut chaque fois que c’est
possible. Voici quelques situations où vous pourriez devoir changer
l’ouverture :

    1)  Un objet étendu, comme une galaxie, est trop grand pour tenir
        dans l’ouverture par défaut.

    2)  Les étoiles d’un amas sont si proches les unes des autres
        qu’il faut une ouverture plus petite pour isoler chaque étoile
        et éviter que les lectures soient contaminées.

    3)  Vous pouvez obtenir des lectures du ciel plus précises avec des
        temps d’intégration plus courts en utilisant une ouverture plus
        grande. Dans ce cas, assurez-vous qu’aucune étoile ne se trouve
        dans l’ouverture, pour ne pas contaminer les lectures du ciel.

    REMARQUE : si vous changez la taille de l’ouverture après avoir
    fait les lectures du ciel, les comptages moyens du ciel par seconde
    seront automatiquement mis à l’échelle de la nouvelle taille
    d’ouverture pour la détermination des magnitudes.

Rubriques connexes :
    Galaxies et autres sources étendues
    Faire des lectures du ciel

**Définir le type de lecture**
L’interrupteur « Lecture » (Reading) du panneau de commande du
photomètre sert à indiquer comment la lecture est interprétée et
consignée. Vérifiez bien que cet interrupteur est dans la bonne
position avant d’appuyer sur le bouton « Démarrer » (Start) pour
commencer une lecture. Si vous faites la lecture d’une étoile ou d’un
autre objet alors que l’interrupteur de lecture est sur « Ciel » (Sky),
vous remplacerez votre lecture du ciel actuelle (présumée correcte)
par une lecture non valide qui inclut l’objet. Si cela se produit, vous
devrez vous éloigner de l’objet et faire une lecture du ciel valide
avant de continuer.

    REMARQUE : l’interrupteur « Lecture » peut ne pas apparaître sur le
    panneau de commande du photomètre pour le TP « Photométrie
    photoélectrique des amas » (Photoelectric Photometry of Clusters).
    Dans ce cas, le logiciel détecte automatiquement la présence ou
    l’absence d’un objet dans l’ouverture et traite la lecture en
    conséquence.

**Faire des lectures du ciel**
Vous devez faire une lecture du ciel à travers chaque filtre avant de
pouvoir mesurer la luminosité d’objets à travers ce filtre. Un seul
jeu de lectures du ciel suffit tant que vous continuez à utiliser le
même télescope. Si vous changez de télescope, vous devez faire un
nouveau jeu de lectures du ciel, même si vous revenez à un télescope
que vous avez déjà utilisé. Faites les lectures du ciel comme suit :

    1)  Depuis le panneau de commande du télescope, vérifiez que la vue
        est réglée sur « Télescope » (Telescope) et utilisez les
        boutons « NSEO » pour positionner le télescope de sorte
        qu’aucune étoile ne se trouve dans le cercle rouge de
        l’ouverture ni juste à côté. S’il y a assez de ciel dégagé
        dans l’image, vous pouvez augmenter la précision de vos mesures
        du ciel en augmentant la taille de l’ouverture.

    2)  Accédez (ou revenez) aux commandes du photomètre. Si
        l’interrupteur « Lecture » est visible, vérifiez qu’il est sur
        « Ciel ». Si aucun interrupteur « Lecture » n’apparaît, la case
        « Objet » (Object) doit indiquer « Ciel » si le télescope est
        correctement positionné.

    3)  Réglez le filtre sur la couleur voulue. (Si une lecture du ciel
        a été faite avec un filtre donné, la case « Ciel moyen » (Mean
        Sky) contiendra les comptages moyens du ciel par seconde pour
        ce filtre. Sinon, elle indiquera « PAS DE CIEL ! » (NO SKY!).)

    4)  Réglez la durée d’intégration sur 10 secondes et le nombre
        d’intégrations sur 5.

    5)  Appuyez sur « Démarrer » et attendez que les lectures
        apparaissent. Vous verrez les comptages bruts à mesure que
        chaque intégration se termine. Quand la lecture est terminée,
        le comptage moyen du ciel dans cette couleur apparaît dans la
        case « Comptages moyens du ciel par seconde » (Mean Sky
        Counts/Sec).

    6)  Répétez l’opération pour chaque filtre que vous utiliserez.

    7)  Choisissez « Fichier » (File)->« Données » (Data)->
        « Consigner/Revoir » (Record/Review) dans le menu du photomètre
        pour enregistrer les lectures du ciel. (Vous n’aurez peut-être
        pas besoin de le faire si le programme est réglé pour calculer
        automatiquement les magnitudes stellaires à votre place. Si vous
        calculez vous-même les magnitudes à partir des comptages de
        photons, vous DEVEZ consigner les lectures du ciel.)

Rubriques connexes :
    Définir la taille de l’ouverture
    Définir le type de lecture
    Autres rubriques d’aide sous « Utiliser le photomètre ».

**Étoiles et autres sources ponctuelles**
Vous devez faire des lectures du ciel avant de pouvoir faire des
mesures photométriques d’étoiles et d’autres objets. Quand vous avez
terminé les mesures du ciel, faites des lectures photométriques de
sources ponctuelles comme suit :

    1)  Depuis le panneau de commande du télescope, centrez
        grossièrement l’étoile dans le carré rouge de la vue
        « Chercheur » (Finder). Passez à la vue « Télescope » et
        centrez précisément l’étoile dans le cercle rouge de
        l’ouverture. (L’ouverture doit être réglée sur sa taille par
        défaut.) Si l’étoile a une compagne proche, veillez à garder
        cette compagne en dehors du cercle de l’ouverture. Dans ce cas,
        l’étoile que vous mesurez peut ne pas être bien centrée. Vous
        pouvez aussi utiliser une ouverture plus petite pour éviter la
        contamination par l’étoile proche.

    2)  Revenez au panneau de commande du photomètre. VÉRIFIEZ que
        l’interrupteur « Lecture » est sur « Objet ». Si l’interrupteur
        « Lecture » n’apparaît pas, la case « Objet » peut contenir une
        identification de l’étoile ou de l’autre objet que vous
        mesurez. Elle ne doit pas indiquer « Ciel ».

    3)  Réglez le filtre sur la couleur voulue. (Si la case « Comptages
        moyens du ciel » indique « PAS DE CIEL ! », vous ne pouvez pas
        faire de mesure dans cette couleur. Revenez aux commandes du
        télescope, sortez l’étoile du cercle rouge de l’ouverture, puis
        revenez aux commandes du photomètre et mesurez le ciel.)

    4)  Réglez la durée d’intégration et le nombre d’intégrations
        voulus. (Il peut falloir procéder par tâtonnements ici ; voir
        l’étape 5 ci-dessous.)

    5)  Appuyez sur le bouton « Démarrer » de l’intégration et attendez
        que les lectures apparaissent. Vous verrez les comptages bruts à
        mesure que chaque intégration se termine. Quand la lecture est
        terminée, le comptage moyen par seconde, le rapport signal sur
        bruit (ou S/B) et la magnitude calculée apparaissent dans les
        cases correspondantes. Pour une précision maximale, vos lectures
        devraient refléter des rapports signal sur bruit de 100 ou plus.
        Si votre S/B est inférieur à cette valeur, vous devriez
        augmenter la durée d’intégration, le nombre d’intégrations, ou
        les deux, puis faire une nouvelle lecture (ne consignez pas
        l’ancienne). (Si votre S/B est VRAIMENT faible, vous devrez
        peut-être utiliser un plus grand télescope pour obtenir une
        photométrie précise.) Si votre S/B est très élevé (> ~500), vous
        pouvez diminuer la durée d’intégration et/ou le nombre
        d’intégrations pour les prochaines étoiles de magnitude à peu
        près identique afin de gagner du temps.

    6)  Répétez les lectures pour chaque filtre que vous utilisez.
        Notez que la plupart des étoiles paraissent plus faibles dans le
        bleu (B), et plus faibles encore dans l’ultraviolet (U), que
        dans le visuel (V). C’est dû aux effets combinés de la
        température stellaire et du rougissement interstellaire. Vous
        devrez peut-être augmenter la durée d’intégration et le nombre
        d’intégrations ; vérifiez toujours le rapport signal sur bruit.

    7)  Choisissez « Fichier »->« Données »->« Consigner/Revoir » dans
        le menu pour enregistrer les lectures photométriques. SI VOUS
        REVENEZ À L’AFFICHAGE PRINCIPAL SANS CONSIGNER LES LECTURES,
        VOUS LES PERDREZ ET DEVREZ REFAIRE LES MESURES !

Rubriques connexes :
    Définir la taille de l’ouverture
    Définir le type de lecture
    Autres rubriques d’aide sous « Utiliser le photomètre ».
    Rubriques sous « Aide » du menu du panneau de commande du télescope.

**Galaxies et autres sources étendues**
En général, la technique de mesure photométrique des galaxies et des
autres sources étendues est la même que pour les étoiles, sauf que,
pour les galaxies, il faut régler l’ouverture assez grande pour
englober tout l’objet. Cela entraîne plusieurs complications :

    1)  L’étendue réelle d’une galaxie peut être nettement plus grande
        qu’elle n’en a l’air, de sorte que les lectures de magnitude
        peuvent dépendre de la taille de l’ouverture, même si une
        ouverture plus petite semble contenir toute l’image.

    2)  Pour les grandes galaxies, il peut être impossible d’inclure
        tout l’objet dans l’ouverture sans inclure aussi un certain
        nombre d’étoiles proches, ce qui affectera évidemment la
        lecture. Les lectures peuvent être corrigées, mais le processus
        est assez fastidieux (voir le point 4 ci-dessous).

    3)  Pour plus de précision dans la mesure des magnitudes de
        galaxies, vous devriez (si possible) faire vos lectures du ciel
        avec une grande ouverture. Elle n’a pas besoin d’être aussi
        grande que l’ouverture nécessaire pour inclure toute la
        galaxie, mais des lectures du ciel faites avec une ouverture
        aussi petite que celle par défaut peuvent être très imprécises
        une fois mises à l’échelle d’une grande ouverture.

    4)  Pour supprimer les effets des étoiles incluses, vous devez
        mesurer individuellement leurs magnitudes, puis les retirer de
        la magnitude mesurée de la galaxie. Pour le faire avec
        précision, vous devrez faire des lectures du ciel (incluant le
        fond de la galaxie) dans le voisinage immédiat de chaque étoile.
        Vous devriez utiliser pour cela une petite ouverture, et vous
        devrez probablement faire des jeux de lectures du ciel séparés
        pour chaque étoile que vous mesurez. Rappelez-vous aussi que
        vous ne pouvez pas additionner ni soustraire des magnitudes
        algébriquement : vous devez utiliser la formule des magnitudes :
        m1 - m2 = -2.5*Log(f1/f2).

Rubriques connexes :
    Définir la taille de l’ouverture
    Étoiles et autres sources ponctuelles
    Faire des lectures du ciel

**Consigner les lectures**
Pour consigner les mesures photométriques que vous avez faites,
choisissez « Fichier »->« Données »->« Consigner/Revoir » dans le menu
du panneau de commande du photomètre. Un panneau de données apparaît,
avec des informations sur l’objet, l’heure d’observation et les
lectures que vous avez faites. Vous pouvez saisir toutes les notes ou
tous les commentaires que vous voulez conserver dans la case
« Remarques » (Remarks). Appuyez sur « OK » pour consigner toutes les
données. (Vous n’avez pas besoin de remplir la case « Type sp. ».)

Normalement, vous n’avez pas besoin de consigner les données de chaque
couleur (filtre) au fur et à mesure. Attendez d’avoir mesuré l’étoile
(ou le ciel) dans toutes les couleurs voulues. (Chaque fois que vous
consignez des données, vous créez un enregistrement distinct, même si
l’enregistrement ne contient les données que d’une seule couleur. Vous
n’en aurez peut-être besoin que pour une datation très précise dans
des études de variabilité.) Notez que les enregistrements sont
horodatés avec la date julienne à 6 décimales (environ 0.1
seconde). Il s’agit de l’heure à laquelle la dernière mesure que vous
avez faite (quel que soit le filtre) s’est terminée.

    REMARQUE : consigner vos lectures de cette manière les enregistre en
    interne pour un traitement ultérieur, mais NE les écrit PAS dans un
    fichier. Pour cela, vous devez revenir au panneau de commande de
    l’observatoire et choisir « Outils »->« Éditeurs de résultats »->
    « Résultats d’observation »->« Afficher/imprimer/enregistrer... »
    dans le menu.

Rubriques connexes :
    Rubrique d’aide « Éditeurs de résultats » du menu du panneau de
    commande de l’observatoire.

**Retourner à la fenêtre du télescope**
Vous devriez terminer vos mesures photométriques de l’étoile dans
toutes les couleurs (filtres) requises et consigner vos mesures avant
de retourner à la fenêtre du télescope. Choisissez « Fichier »->
« Quitter le photomètre » dans le menu du panneau de commande du
photomètre (ou appuyez sur le bouton « X » en haut à droite). Vous
serez averti et vous aurez la possibilité d’annuler le retour si vous
n’avez pas consigné toutes les données que vous avez recueillies. Quand
vous retournez à la fenêtre du télescope, vos données consignées pour
l’étoile sur laquelle vous avez travaillé sont placées dans une liste en
mémoire, mais ne sont pas enregistrées dans un fichier.

Rubriques connexes :
    Consigner les lectures
`;
