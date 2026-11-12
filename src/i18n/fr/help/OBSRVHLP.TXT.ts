// Front FR-HELP [W]: OpenVireo's French (fr) web adaptation of VIREO's OBSRVHLP.TXT. Not CLEA's text: the original bytes,
// hashes and provenance are unchanged (public/original). Loaded only by the help viewer, never with the main French chunk.
export const language='fr';
export const sourceName='OBSRVHLP.TXT';
export const sourceSha256='2dcae5e678d69ed80784bb2958ed856289ff04779edd19656681288846102bd7';
export const text=`**« Suivi »**
Le bouton « Suivi » (Tracking) active le suivi sidéral, qui maintient
le télescope pointé sur un endroit précis du ciel pendant que la Terre
tourne. Lorsque le suivi est désactivé, les étoiles dérivent dans le
champ du télescope. Le suivi est désactivé quand on accède pour la
première fois à un télescope. Les autres commandes du télescope ne sont
activées que lorsque le suivi est activé. Le voyant vert indique que le
suivi a été activé.

**Boutons de déplacement (« N », « S », « E », « O »)**
Les boutons de déplacement servent à déplacer le télescope pour le
pointer vers un endroit (une direction) précis du ciel. Pour déplacer
le télescope, maintenez enfoncé le bouton voulu. Le télescope se
déplacera à la vitesse fixée par le réglage « Vitesse de déplacement »
(Slew Rate). Relâchez le bouton pour arrêter le déplacement. Pour les
longs déplacements, le bouton reste enfoncé si vous faites glisser le
pointeur hors de celui-ci avant de relâcher le bouton de la souris.
Dans ce cas, arrêtez le déplacement en appuyant sur le bouton actif,
puis en le relâchant, avec le pointeur placé dessus.

Les boutons de déplacement servent surtout à faire des changements
relativement petits de la position du télescope, afin de placer les
objets dans la zone active de l’instrument utilisé. Pour déplacer le
télescope vers un autre champ ou un autre objet, utilisez la commande
de menu « Déplacer » (Slew).

    -Accès au clavier-
    Les touches fléchées du pavé numérique (touches « 2 », « 4 », « 6 »,
    « 8 ») peuvent remplacer les boutons de déplacement pour déplacer
    le télescope. Verr Num doit être activé et les Touches souris
    (MouseKeys) désactivées. (Si vous utilisez les Touches souris,
    configurez votre système pour qu’elles soient activées quand
    Verr Num est désactivé.)


Rubriques connexes :
    « Vitesse de déplacement »
    « Vue »
    « Déplacer »

**« Vitesse de déplacement »**
Cet interrupteur à curseur règle la vitesse à laquelle le télescope se
déplace quand on appuie sur un bouton de déplacement (« N », « S »,
« E », « O »). La vitesse double chaque fois que le curseur est déplacé
d’un cran vers la droite, jusqu’à une vitesse (relative) maximale de
16. De même, la vitesse est divisée par deux chaque fois que le curseur
est déplacé d’un cran vers la gauche.

Rubriques connexes :
    Interrupteurs à curseur

**« Vue »**
Chaque télescope offre deux vues (ou tailles de champ). Le champ du
chercheur mesure 2 1/2 degrés de côté ; il sert à positionner des
étoiles et d’autres objets dans le champ du télescope, à plus fort
grossissement (indiqué par le carré rouge au centre de la vue du
chercheur). Le champ du télescope mesure 15 minutes d’arc de côté et
montre des étoiles et d’autres objets jusqu’à une magnitude limite bien
plus faible que celle du chercheur. Cette vue sert à positionner
l’objet pour les observations avec l’instrument sélectionné.

Pour changer de vue, placez le curseur sur « Chercheur » (Finder) ou
« Télescope » (Telescope). On ne peut accéder aux instruments que
lorsque la vue du télescope est active.

La zone active de l’instrument sélectionné est cernée de rouge dans la
vue du télescope. L’ouverture du photomètre est représentée par un
cercle rouge, tandis que la fente du spectromètre est indiquée par une
courte paire de lignes parallèles rapprochées. Pour les caméras CCD et
IR, un carré indique la taille du champ de la caméra. (Pour certaines
combinaisons de télescope et de caméra, le champ est plus grand que la
vue de 15 minutes d’arc. Des flèches rouges pointant vers l’extérieur
sur les bords de la vue l’indiquent.)

Rubriques connexes :
    « Instrument »
    Interrupteurs à curseur

**« Instrument »**
Pour accéder à un instrument, placez le curseur « Instrument » sur la
position voulue et appuyez sur le bouton « Accéder » (Access). Les
instruments disponibles dépendent du TP que vous faites. Le bouton
« Accéder » n’est activé que lorsque la vue est réglée sur
« Télescope » (Telescope).

Rubriques connexes :
    « Vue »
    Interrupteurs à curseur

**Interrupteurs à curseur**
Plusieurs commandes des panneaux du télescope et des instruments
utilisent des interrupteurs à curseur pour permettre à l’utilisateur de
choisir une option parmi plusieurs. Pour faire un choix avec un
interrupteur à curseur, vous pouvez soit :

    A)  Placer le pointeur sur le curseur, puis appuyer, maintenir et
        faire glisser le curseur jusqu’à la position voulue, avec le
        bouton gauche de la souris, soit...

    B)  Placer le pointeur sur la position voulue du panneau de
        l’interrupteur et cliquer avec le bouton gauche de la souris,
        soit...

    C)  Accès au clavier : utiliser les touches fléchées pour déplacer
        le curseur lorsque la commande d’interrupteur voulue a été
        sélectionnée. (La commande sélectionnée est entourée d’une
        ligne pointillée. Utilisez Tab et Maj-Tab pour changer de
        sélection.)

**« Déplacer »**
La commande de menu « Déplacer » (Slew) du panneau de commande du
télescope ouvre une boîte de dialogue qui permet de saisir directement
les coordonnées de pointage du télescope. C’est en général plus rapide
que d’utiliser les boutons de déplacement pour passer d’un objet à
l’autre, sauf si les objets sont très proches dans le ciel. Il peut
être nécessaire de faire quelques « réglages fins » avec les boutons de
déplacement pour centrer l’objet dans la fente du spectromètre,
l’ouverture du photomètre ou le champ de la caméra après avoir saisi
les coordonnées.

Rubriques connexes :
    Boutons de déplacement (« N », « S », « E », « O »)

**Paramètres du site et du télescope**
Choisissez « Fichier » (File)->« Informations sur le site... » (Site
Information...) dans le menu du panneau de commande du télescope pour
obtenir des informations sur le site d’observation et le télescope
actuels. Les paramètres listés comprennent la latitude, la longitude,
l’altitude et le fuseau horaire du site. L’ouverture et la distance
focale du télescope sont également indiquées.

Rubriques connexes :
    « Changer de télescope optique » dans « Aide » du panneau de
    commande de l’observatoire
`;
