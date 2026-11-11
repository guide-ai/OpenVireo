// Front FR-HELP [W]: OpenVireo's French (fr) web adaptation of VIREO's PULSRLST.TXT. Not CLEA's text: the original bytes,
// hashes and provenance are unchanged (public/original). Loaded only by the help viewer, never with the main French chunk.
export const language='fr';
export const sourceName='PULSRLST.TXT';
export const sourceSha256='51df0d67752ffa73d661e33751905db3af359e723062c70eb25883b947c79bb8';
export const text=`**Localiser un pulsar dans la liste**
Les noms de pulsars B1950 et J2000 figurent tous deux dans la liste (les
pulsars découverts le plus récemment peuvent ne pas avoir de nom B1950).
Pour localiser un pulsar par son nom :

    o  Choisissez « Fichier » (File)->« Localiser un pulsar... » (Find
       Pulsar...) dans le menu « Paramètres du pulsar » (Pulsar
       Parameters).
    o  Saisissez le nom du pulsar dans la zone.
    o  Choisissez le type de nom.
    o  Appuyez sur « OK ».

Vous pouvez utiliser un nom partiel, à condition qu’il commence au début
du nom.  (Exemple : recherchez « 045 », puis utilisez les boutons
« Suivant » (Next) et « Précédent » (Prev) pour trouver celui que vous
voulez.)  Comme les noms de pulsars sont construits à partir de leurs
positions, vous pouvez utiliser cette technique pour trouver un pulsar
dont vous connaissez l’ascension droite.  Toutes les recherches
commencent au début de la liste, et non à l’enregistrement actuel.

**Changer la date - calculer la période**
La période actuelle est obtenue à partir de la date d’observation
actuelle, du paramètre PDot et du paramètre PEpoch.  Pour calculer la
période à une date différente :

    o  Modifiez la valeur de la date julienne dans le champ intitulé
       « Date (MJD) ».
    o  Appuyez sur le bouton « Mettre à jour » (Update) pour recalculer
       la période.
    o  Pour revenir à la date d’observation actuelle, appuyez sur
       « Réinitialiser » (Reset).

Vous pouvez aussi changer la date d’observation actuelle, au format de
date habituel.  Pour cela :

    o  Choisissez « Fichier » (File)->« Date et heure... »
       (Date/Time...) dans le menu du panneau de commande du télescope.
       (Vous n’avez pas besoin de fermer l’affichage des paramètres du
       pulsar pour cela.  Écartez-le simplement ou réduisez-le.)
    o  Saisissez la date et l’heure voulues dans les zones
       correspondantes.
    o  Appuyez sur « OK ».
    o  Revenez à l’affichage des paramètres du pulsar.  Il peut être
       utile d’appuyer sur « Réinitialiser » pour être sûr que la
       nouvelle date est utilisée.  (Cela devrait se faire
       automatiquement lorsque l’affichage est rouvert.)

**Changer la densité électronique - calculer la distance**
La distance dérivée est calculée à partir du paramètre Dispersion et de
la densité électronique.  Pour voir l’effet des changements de la
densité électronique sur la distance calculée :

    o  Modifiez la valeur de la densité électronique dans le champ
       intitulé « Densité électronique » (Electron Density).
    o  Appuyez sur le bouton « Mettre à jour » pour recalculer la
       distance.

**Revenir aux valeurs actuelles**
Le bouton « Réinitialiser » (Reset) ramène l’affichage à la date et à
l’heure d’observation actuelles et à la densité électronique par défaut
de 0.03.  Comme l’horloge tourne en permanence, la date julienne (JD)
change toujours légèrement lorsque vous le faites, mais les valeurs de
PDot sont si petites que cela n’a généralement aucun effet notable sur
la période.

**Sélectionner des pulsars pour l’étude**
Lorsqu’ils choisissent les pulsars que les étudiants vont observer, les
enseignants doivent sélectionner dans la liste des objets dont les
densités de flux sont enregistrées aux trois fréquences (soit 400, 600
et 1400 MHz).  Sachez aussi qu’il est difficile de détecter des
impulsions avec l’instrument et les facteurs de gain par défaut si la
densité de flux est inférieure à 10.0.  Pour travailler avec les pulsars
plus faibles, augmentez l’ouverture du télescope et/ou le « Facteur de
gain de base » (Base Gain Factor) dans les « Options ».
`;
