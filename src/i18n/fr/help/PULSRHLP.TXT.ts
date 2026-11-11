// Front FR-HELP [W]: OpenVireo's French (fr) web adaptation of VIREO's PULSRHLP.TXT. Not CLEA's text: the original bytes,
// hashes and provenance are unchanged (public/original). Loaded only by the help viewer, never with the main French chunk.
export const language='fr';
export const sourceName='PULSRHLP.TXT';
export const sourceSha256='3a6b8e727be8340095a284ad8dbe4e075613b2d081d83e93537a901a6c8377fc';
export const text=`**Commandes du radiotélescope**
Les boutons suivants servent à piloter le radiotélescope.  Ils se
trouvent sur le panneau de commande du télescope.  Selon les réglages
choisis par votre enseignant, le déplacement peut être limité par
l’horizon local et peut-être par d’autres limites du télescope.

    « Suivi » (Tracking) - Ce bouton active le suivi sidéral, qui permet
    au télescope de rester pointé sur un endroit précis du ciel pendant
    que la Terre tourne.  Lorsque le suivi est désactivé, les objets
    célestes dérivent dans le champ du télescope, comme l’indique
    l’affichage changeant de l’ascension droite.  Le suivi est désactivé
    lorsqu’on accède au télescope pour la première fois.  REMARQUE : si
    le télescope est un instrument de passage au méridien, le bouton
    « Suivi » n’apparaît pas sur le panneau de commande.

    « Vitesse de déplacement » (Slew Rate) - Cette paire de boutons sert
    à régler la vitesse à laquelle le télescope se déplace lorsqu’on
    appuie sur un bouton de déplacement (bouton N, S, E ou O).  La
    vitesse peut varier par facteurs de dix dans une assez large plage.

    Boutons de déplacement (« N », « S », « E », « O ») - Les boutons de
    déplacement servent à déplacer le télescope pour le pointer sur un
    endroit (une direction) précis du ciel.  Pour déplacer le télescope,
    appuyez sur le bouton voulu et maintenez-le enfoncé.  Le télescope
    se déplacera à une vitesse déterminée par le réglage de la vitesse
    de déplacement.  Relâchez le bouton pour arrêter le déplacement.
    Pour les longs déplacements, le bouton restera enfoncé si vous
    faites glisser le curseur hors de lui avant de relâcher le bouton de
    la souris.  Dans ce cas, arrêtez le déplacement en appuyant sur le
    bouton de la souris puis en le relâchant, le curseur étant placé sur
    le bouton de déplacement actif.  REMARQUE : si le télescope est un
    instrument de passage au méridien, les boutons « E » et « O »
    n’apparaissent pas sur le panneau de commande.

    « Récepteur » (Receiver) - Appuyez sur ce bouton pour accéder au
    premier récepteur, ou récepteur « principal » (master).

Rubriques connexes :
    Définir les coordonnées
    Remarques sur le déplacement du télescope
    Utiliser les récepteurs

**Définir les coordonnées**
Pour saisir directement les coordonnées de pointage souhaitées du
télescope, choisissez « Déplacer » (Slew)->« Définir les
coordonnées... » (Set Coordinates...) dans le menu du panneau de
commande du radiotélescope et saisissez les coordonnées dans le
formulaire qui apparaît.  C’est généralement plus rapide que d’utiliser
les boutons de déplacement pour faire passer le télescope d’un objet à
l’autre, sauf si les objets sont très proches dans le ciel.  REMARQUE :
si le télescope est un instrument de passage au méridien, cette fonction
déplace le télescope en déclinaison seulement.

Rubriques connexes :
    Commandes du radiotélescope
    Remarques sur le déplacement du télescope

**Remarques sur le déplacement du télescope**
La portion du ciel accessible à un télescope à un moment donné est
limitée par plusieurs facteurs.  En réalité, aucun télescope, optique ou
radio, ne peut « voir » sous l’horizon local.  Si le programme est
configuré ainsi, le télescope de cet exercice ne peut pas se déplacer
sous une hauteur située à plusieurs degrés au-dessus de l’horizon
géographique « réel ».

De plus, de nombreux radiotélescopes sont limités par leur conception à
des régions restreintes du ciel situées au-dessus d’eux.  Le cas le plus
courant est celui du télescope de passage au méridien, qui ne peut se
déplacer qu’en déclinaison et doit attendre que l’objet observé soit
amené à travers le champ de vision par la rotation de la Terre.  Un
autre type de restriction est illustré par l’antenne de 1000 pieds
d’Arecibo, qui ne peut être pointée que sur des objets situés à quelques
degrés du zénith local.  Ce logiciel peut être configuré pour simuler
l’une ou l’autre de ces restrictions de déplacement : votre enseignant
vous indiquera si cela a été fait.  Si le logiciel est configuré pour
simuler un instrument de passage au méridien, les boutons « Suivi »
(Tracking), « E » et « O » n’apparaissent pas sur le panneau de
commande, et les fonctions « Définir les coordonnées » (Set Coordinates)
et « Liste d’objets » (Hot List) déplacent le télescope en déclinaison
seulement.

Contrairement aux télescopes optiques, les radiotélescopes sont
utilisables de jour comme de nuit.  La solution la plus simple pour
observer des objets qui sont actuellement hors de la plage accessible du
télescope (en ascension droite) est donc d’attendre quelques heures ou,
avec ce logiciel, de changer la date et l’heure simulées.

Pour simplifier cet exercice, votre enseignant peut configurer le
logiciel pour qu’il ignore toutes les restrictions de déplacement et
déplace le télescope vers n’importe quelle partie du ciel à tout moment.
Vous en serez informé le cas échéant.

Voir aussi :
    « Définir la date et l’heure d’observation »

**Sélectionner un objet de la « Liste d’objets »**
Pour déplacer le télescope vers un élément de la liste d’objets,
choisissez « Déplacer » (Slew)->« Liste d’objets » (Hot
List)->« Voir/sélectionner dans la liste... » (View/Select from List...)
dans le menu du panneau de commande du radiotélescope.  Lorsque la liste
apparaît, cliquez sur l’entrée voulue pour la mettre en surbrillance.
Appuyez sur « OK » et le télescope se déplacera vers l’objet.  (Le
logiciel peut être configuré pour n’autoriser le déplacement que vers
les objets situés au-dessus de l’horizon de l’instrument et dans sa
plage de déplacement.)  Si le télescope est un instrument de passage au
méridien, la fonction « Liste d’objets » déplace le télescope en
déclinaison seulement.

Voir aussi :
    « Remarques sur le déplacement du télescope »

**Ajouter un objet à la « Liste d’objets »**
Vous pouvez ajouter des objets intéressants à la liste d’objets pour
pouvoir y revenir facilement plus tard et les observer de nouveau.  Pour
ajouter un objet, pointez avec précision le télescope vers lui et
accédez à un récepteur pour vérifier que vous avez localisé un pulsar.
Choisissez ensuite « Déplacer » (Slew)->« Liste d’objets » (Hot
List)->« Ajouter l’objet actuel à la liste... » (Add Current Item to
List...) dans le menu du panneau de commande du radiotélescope.  Dans le
formulaire qui apparaît, vous pouvez ajouter un commentaire qui vous
aidera à identifier l’objet ou à vous rappeler pourquoi il présente un
intérêt.  (Vous pouvez aussi modifier l’identification et la position
pour ajouter un objet qui n’est pas actuellement dans le champ du
télescope.)  Lorsque vous avez terminé la saisie, appuyez sur « OK »
pour l’ajouter à la liste.  (Si vous créez une entrée erronée par
erreur, consultez la rubrique d’aide « Retirer un objet de la « Liste
d’objets » ».)

**Retirer un objet de la « Liste d’objets »**
Pour retirer une entrée de la liste d’objets, choisissez « Déplacer »
(Slew)->« Liste d’objets » (Hot List)->« Voir/sélectionner dans la
liste... » (View/Select from List...) dans le menu du panneau de
commande du radiotélescope.  Lorsque la liste apparaît, cliquez sur
l’entrée voulue pour la mettre en surbrillance, puis appuyez sur le
bouton « Supprimer » (Delete).  Il vous sera demandé de confirmer la
suppression avant que l’entrée soit retirée de la liste.  Lorsque vous
avez terminé, vous pouvez appuyer sur « Annuler » (Cancel) pour fermer
la liste d’objets si vous ne voulez déplacer le télescope vers aucun des
objets restants.

**Définir la date et l’heure d’observation**
Pour définir la date et l’heure « actuelles » du télescope, fermez le
panneau de commande du radiotélescope, puis choisissez « Fichier »
(File)->« Définir la date et l’heure d’observation, l’ID... » (Set
Observation Date/Time, ID...) dans le menu du panneau de commande de
l’observatoire.

Rubriques connexes :
    « Définir la date et l’heure » (Set Date & Time) dans le menu
    « Aide » (Help) du panneau de commande de l’observatoire.

**Analyser les données de pulsars**
Pour analyser les données de pulsars que vous avez acquises et
consignées, choisissez « Outils » (Tools)->« Outil d’analyse de pulsars
radio » (Radio Pulsar Analysis Tool) dans le menu du panneau de commande
de l’observatoire.

Rubriques connexes :
    Recevoir les signaux
    Acquérir les signaux
    Mesurer les signaux reçus
    Rubriques d’« Aide » (Help) du menu de l’outil d’analyse des
    pulsars.

**Fermer le panneau de commande du radiotélescope**
Pour fermer le panneau de commande du radiotélescope, choisissez
« Fichier » (File)->« Quitter » (Exit) dans le menu, ou utilisez l’une
des fonctions Windows habituelles (menu système ou case « X ») pour
fermer la fenêtre.  Les données non enregistrées vous seront rappelées
et vous aurez la possibilité de les enregistrer avant la fermeture du
télescope.

**Accéder aux récepteurs**
Pour accéder au récepteur principal (« master »), appuyez sur le bouton
« Récepteur » (Receiver) du panneau de commande du radiotélescope.  Une
fois la fenêtre du récepteur principal affichée, jusqu’à deux canaux
supplémentaires, ou récepteurs « secondaires » (slave), peuvent être
ajoutés en appuyant sur le bouton « Ajouter un canal » (Add Channel) du
panneau du récepteur principal.

**Commandes du récepteur**
Les commandes suivantes servent à piloter les récepteurs.  Notez que
certaines commandes se trouvent uniquement sur le récepteur principal
(« master »).  Pendant la réception, les commandes Secondes horizontales
(Horizontal Seconds), Ajouter un canal (Add Channel) et Consigner
(Record) sont désactivées.  Pendant l’acquisition, toutes les commandes
sont désactivées, sauf Mode du récepteur (Receiver Mode), Aligner les
récepteurs (Align Receivers) et Volume.

    Fréquence du récepteur (Receiver Frequency) - Cette commande règle
    la fréquence du récepteur.  Chaque clic sur le bouton fléché
    correspondant augmente ou diminue la fréquence de la valeur (en MHz)
    déterminée par la commande Incrément de fréquence.  La fréquence
    peut être réglée à des valeurs comprises entre 400.00 et 1400.00
    MHz.  La commande Fréquence du récepteur apparaît sur tous les
    récepteurs et est désactivée pendant l’acquisition.

    Incrément de fréquence (Frequency Increment) - Cette commande règle
    l’incrément de la commande Fréquence du récepteur.  L’incrément peut
    varier entre 0.01 et 100 MHz par facteurs de dix.  La commande
    Incrément de fréquence apparaît sur tous les récepteurs et est
    désactivée pendant l’acquisition.

    Gain vertical (Vertical Gain) - Cette commande règle l’amplification
    appliquée au signal par le récepteur.  Elle agit à la fois sur la
    « hauteur » du signal à l’écran et sur l’intensité du signal acquis.
    Le gain vertical peut varier entre 0.125 et 8.0 (unités arbitraires)
    par facteurs de deux.  La commande Gain vertical apparaît sur tous
    les récepteurs et est désactivée pendant l’acquisition.

    Secondes horizontales (Horizontal Seconds) - Cette commande règle
    l’échelle de temps du signal reçu.  En plus de fixer l’échelle
    horizontale de l’affichage et du signal acquis, elle modifie la
    « constante de temps », c’est-à-dire le temps d’intégration effectif
    du récepteur.  Ainsi, régler les secondes horizontales sur une
    valeur plus élevée aide à détecter les signaux faibles en augmentant
    le rapport signal sur bruit, tandis que des valeurs plus faibles
    rendent visibles les formes des impulsions et permettent de mesurer
    plus précisément leurs positions.  Les secondes horizontales peuvent
    varier entre 0.5 et 16.0 par facteurs de deux.  Ce réglage agit sur
    tous les récepteurs ouverts ; la commande n’apparaît donc que sur le
    récepteur principal (bien que l’affichage de la valeur apparaisse
    sur tous les récepteurs).  La commande Secondes horizontales est
    désactivée à la fois pendant la réception et pendant l’acquisition.

    Ajouter un canal - Appuyer sur ce bouton ouvre un récepteur
    secondaire (« slave »).  La fréquence et le gain vertical des
    récepteurs secondaires peuvent être réglés indépendamment ; tous les
    autres paramètres et commandes sont établis par le récepteur
    principal.  Deux récepteurs secondaires au maximum peuvent être
    ajoutés.  La commande « Ajouter un canal » est désactivée à la fois
    pendant la réception et pendant l’acquisition.  Les récepteurs
    secondaires peuvent être fermés sans fermer le récepteur principal,
    mais certaines restrictions s’appliquent : voir la rubrique d’aide
    « Fermer les récepteurs ».

    Aligner les récepteurs - Ce bouton active (« oui », yes) ou
    désactive (« non », no) l’alignement des récepteurs.  Lorsque
    l’alignement est désactivé, tous les récepteurs ouverts peuvent être
    déplacés et positionnés indépendamment, n’importe où sur l’écran.
    Lorsque l’alignement est activé, les récepteurs se placent en pile
    sous le récepteur principal et le « suivent » chaque fois qu’il est
    déplacé.  Les récepteurs secondaires ne peuvent pas être déplacés
    indépendamment lorsque l’alignement est activé.  Cette commande est
    toujours activée.

    Mode du récepteur - Ce bouton sert à démarrer et à arrêter les
    récepteurs.  Lorsque le mode est réglé sur « Recevoir » (Receive),
    tous les récepteurs ouverts commencent à afficher les signaux reçus.
    L’acquisition commence aussi si l’interrupteur d’acquisition est sur
    « Activé » (On), et des sons se font entendre si l’ordinateur est
    correctement équipé et que les effets sonores sont activés.  Pour
    arrêter la réception et l’acquisition, appuyez de nouveau sur le
    bouton Mode du récepteur pour passer le mode sur « Arrêter » (Stop).
    La réception, l’acquisition et le son s’arrêteront alors lorsque
    l’affichage atteindra la fin du panneau en cours.  (Voir aussi la
    rubrique d’aide « Acquérir les signaux ».)

    Interrupteur d’acquisition (Record Switch) - Ce bouton active et
    désactive l’acquisition des signaux.  Il n’est activé que lorsque le
    mode du récepteur est « Arrêter » (voir ci-dessus).  Voir la
    rubrique d’aide « Acquérir les signaux » pour plus d’informations.

    Commande de volume (Volume Control) - Cette commande n’apparaît sur
    le récepteur principal que si l’ordinateur est correctement équipé
    pour la reproduction sonore et que les fonctions sonores de ce
    logiciel ont été activées.  Utilisez-la pour régler le volume du son
    pendant la réception et l’acquisition.  Voir la rubrique d’aide
    « Sons » pour plus d’informations.

**Recevoir les signaux**
Pour recevoir les signaux d’un pulsar, pointez avec précision le
télescope sur la position du pulsar.  Le suivi du télescope doit être
activé.  (Si vous utilisez un télescope de passage au méridien, voyez la
remarque ci-dessous.)  Une fois que le télescope a cessé de bouger,
accédez au récepteur.  Pour commencer à recevoir un signal, appuyez sur
le bouton « Mode ».  Pour arrêter, appuyez de nouveau sur le bouton
« Mode » ; la réception s’arrêtera à la fin de l’affichage en cours.
Notez que, pendant la réception des signaux, vous pouvez modifier
séparément la fréquence et le gain vertical de chaque récepteur actif.
Lorsque la réception est arrêtée, vous pouvez en outre ouvrir de
nouveaux canaux de réception, régler l’échelle de temps (secondes
horizontales) et activer l’acquisition des données.

Vous devez régler chaque récepteur de façon que les impulsions soient
bien visibles.  Si les signaux sont noyés dans le bruit, il peut être
utile d’augmenter les secondes horizontales ; cela augmentera le rapport
signal sur bruit.  Utilisez le gain vertical pour régler la hauteur des
impulsions ; elles doivent être bien visibles mais ne doivent pas
atteindre le haut de l’affichage ni être écrêtées par lui.

REMARQUE : pour un télescope de passage au méridien, vous devez choisir
une heure d’observation à laquelle le pulsar se trouve juste à l’est du
méridien du télescope.  Positionnez avec précision la déclinaison du
télescope et commencez à recevoir.  Lorsque le pulsar entre dans le
faisceau du télescope, vous commencez à recevoir les impulsions.  Elles
deviennent plus fortes, puis commencent à faiblir et finissent par
disparaître lorsque le mouvement de la Terre fait passer le faisceau du
télescope au-delà de l’objet.  Vous devez effectuer toutes vos
observations, y compris l’acquisition du signal, pendant le court moment
où le pulsar se trouve dans le faisceau.

Rubriques connexes :
    Commandes du radiotélescope
    Remarques sur le déplacement du télescope
    Accéder aux récepteurs
    Commandes du récepteur

**Acquérir les signaux**
Pour acquérir les signaux reçus d’un pulsar, effectuez d’abord les
étapes décrites dans la rubrique d’aide « Recevoir les signaux ».
Lorsque vous avez réglé tous les récepteurs pour obtenir des impulsions
nettes et facilement identifiables, arrêtez la réception, appuyez sur le
bouton « Consigner » (Record) pour activer l’acquisition, puis
recommencez à recevoir.  Tout ce que vous voyez sur les écrans des
récepteurs sera acquis, jusqu’à un maximum de 4 écrans complets (de 2 à
64 secondes, selon le réglage des secondes horizontales).  Pour arrêter
l’acquisition, appuyez sur le bouton Mode pour arrêter la réception
(mais vous n’acquerrez jamais plus que les quatre premiers écrans).

Les signaux acquis peuvent être mesurés avec l’outil d’analyse des
pulsars radio, et/ou enregistrés pour une analyse ultérieure.

Rubriques connexes :
    Enregistrer les signaux reçus
    Analyser les données de pulsars

**Sons**
Si votre ordinateur est correctement équipé et que les fonctions sonores
du logiciel sont activées, vous entendrez les sons des impulsions et du
bruit de fond pendant la réception des signaux.  Vous pouvez régler le
volume sonore avec la commande de volume du récepteur principal.  Le son
reflétera fidèlement la période et l’intensité du signal du pulsar
observé.

Le son sera, en général, synchronisé avec l’affichage du récepteur
principal.  Cependant, comme le son et la vidéo des PC sont gérés par
des sous-systèmes complètement séparés et indépendants, il est possible
que le son et la vidéo se « désynchronisent ».  Cela ne sera
probablement perceptible que pour les pulsars dont la période dépasse
environ 1/2 seconde.  Arrêter puis redémarrer le récepteur peut
resynchroniser le son et la vidéo.

**Mesurer les signaux reçus**
Les signaux reçus peuvent être mesurés directement sur l’écran du
récepteur, une fois la réception arrêtée.  Appuyez avec le bouton gauche
de la souris et faites glisser pour créer et déplacer un curseur
vertical sur chaque écran de récepteur.  La position du curseur, donnée
en secondes à partir du bord gauche de l’affichage, apparaît en haut à
gauche de chaque écran.  Si vous appuyez avec le bouton droit de la
souris et faites glisser, vous créez et déplacez un seul curseur de
« référence » qui apparaît à la même position sur tous les écrans de
récepteur ouverts.  Sa valeur apparaît en haut à droite de tous les
écrans.

Cette méthode vous limite à des mesures sur un seul écran (une seule
durée) de données.  Pour des durées plus longues, des mesures plus
précises (avec zoom et déplacement) et des fonctions d’enregistrement
des mesures, vous devez acquérir les données du récepteur et utiliser
l’outil d’analyse de pulsars radio.

Rubriques connexes :
    Acquérir les signaux
    Enregistrer les signaux reçus
    Analyser les données de pulsars

**Enregistrer les signaux reçus**
Les signaux acquis sont conservés en mémoire vive (RAM).  Dans cet état,
ils peuvent être transmis directement à l’outil d’analyse des données,
mais si vous ne prévoyez pas de le faire immédiatement, ou si vous avez
besoin d’un enregistrement « permanent » pour toute autre raison, vous
devez enregistrer ces données dans un fichier.  (Les signaux acquis en
mémoire vive sont effacés au prochain démarrage d’une acquisition.)
Lorsque vous terminez l’acquisition d’un signal, vous avez la
possibilité de l’enregistrer immédiatement, ou de le transférer
immédiatement dans la fenêtre d’analyse des données.  Si vous ne
l’enregistrez pas à ce moment-là, vous pourrez le faire plus tard en
choisissant « Fichier » (File)->« Enregistrer les données
consignées... » (Save Recorded Data...) dans le menu de commande du
radiotélescope, ou « Fichier »->« Enregistrer... » (Save...) dans le
menu de l’outil d’analyse des données.

Lorsque vous choisissez d’enregistrer le fichier, un formulaire apparaît
et vous permet de saisir ou de choisir un nom pour le fichier
enregistré.  Vous pouvez utiliser le nom que vous voulez ; le programme
proposera un nom généré à partir de vos informations de connexion.  Vous
devez toujours utiliser l’extension « .PLR » pour ces fichiers afin
d’éviter des difficultés et des confusions par la suite.

**Fermer les récepteurs**
Les fenêtres des récepteurs se ferment par le menu système (cliquez sur
la petite case en haut à gauche de la fenêtre du récepteur, puis
choisissez « Fermer » (Close)) ou par la case « X » en haut à droite de
la fenêtre.  Fermer la fenêtre du récepteur principal ferme toutes les
fenêtres de récepteur ouvertes.  Les récepteurs secondaires peuvent être
fermés individuellement, mais ils doivent l’être dans l’ordre inverse de
leur création (c’est-à-dire que le dernier récepteur créé doit être
fermé en premier).
`;
