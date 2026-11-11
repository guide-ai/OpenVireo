// Front FR-HELP [W]: OpenVireo's French (fr) web adaptation of VIREO's SPECHLP.TXT. Not CLEA's text: the original bytes, hashes and
// provenance are unchanged (public/original). Loaded only by the help viewer, never with the main French chunk.
export const language='fr';
export const sourceName='SPECHLP.TXT';
export const sourceSha256='e085a513389cd65a7726260daf6607b8c277be6e6a2a46222a8fd5bb90fcee79';
export const text=`**Définir la plage de longueurs d’onde**
Vous pouvez modifier la plage de longueurs d’onde enregistrée par le
spectromètre, dans la limite de la plage maximale de 3500 à 7400
angströms.  (Votre enseignant doit vous dire s’il y a une raison de le
faire.)  Pour modifier la plage de longueurs d’onde, choisissez
« Fichier » (File)->« Préférences » (Preferences)->« Plage spectrale »
(Spectral Range) dans le menu du panneau de commande du spectromètre.
Utilisez les curseurs pour modifier la valeur minimale et/ou maximale.
Le bouton « Par défaut » (Default) ramène les valeurs à la plage
optimale pour la classification spectrale.  Notez que vous perdrez tout
spectre que vous avez obtenu mais pas enregistré lorsque vous
modifiez la plage de longueurs d’onde.

**Démarrer/reprendre le comptage**
Appuyez sur le bouton d’intégration « Démarrer » (Go) du spectromètre
pour commencer ou poursuivre l’intégration du spectre.  Vous verrez le
spectre prendre peu à peu une forme reconnaissable à mesure que les
comptages s’accumulent dans chacun des 500 canaux du spectromètre.
(L’affichage est toujours normalisé sur la lecture la plus élevée de
l’ensemble des canaux, de sorte qu’avec le temps vous voyez le bruit
diminuer plutôt que les comptages monter.)  Le nombre total actuel de
photons, le temps d’intégration, le comptage moyen par canal et le
rapport signal sur bruit sont affichés sous le graphique.
L’identification de l’objet et la magnitude apparente sont aussi
affichées pour certains TP.

**Arrêter le comptage**
Appuyer sur le bouton d’intégration « Arrêter » (Stop) met
l’intégration en pause.  L’affichage est redessiné avec des lignes qui
relient les lectures des canaux adjacents, pour plus de clarté.  Vous
pouvez arrêter et reprendre autant de fois que vous le voulez ;
l’intégration reprend toujours là où elle s’était arrêtée.  (Vous ne
pouvez pas « perdre » un spectre, sauf si vous fermez le panneau de
commande du spectromètre sans l’enregistrer.)

**Imprimer le spectre**
Pour imprimer le spectre actuel, choisissez « Fichier » (File)->
« Données » (Data)->« Imprimer le spectre... » (Print Spectrum...)
dans le menu du panneau de commande du spectromètre.  Le formulaire
standard des options d’impression de Windows apparaît.  (Votre
enseignant peut vous donner des informations supplémentaires sur la
configuration de l’impression et le choix de l’imprimante.)  Le spectre
est imprimé tel qu’il apparaît à l’écran, avec des informations
d’identification en en-tête.

**Enregistrer le spectre pour l’analyse**
Vous ne pouvez pas mesurer ni classer un spectre que vous avez obtenu
tant que vous ne l’avez pas enregistré.  Lorsque vous estimez que le
rapport signal sur bruit est suffisamment élevé pour une analyse
précise (voir ci-dessous), arrêtez le comptage et choisissez
« Fichier » (File)->« Données » (Data)->« Enregistrer le spectre... »
(Save Spectrum...) dans le menu du panneau de commande du spectromètre.
Un nom de fichier est généré à partir du nom ou de l’identifiant de
l’objet (extension .CSP).  On vous demandera de vérifier le nom et le
chemin du fichier.  (En général, vous ne devez pas modifier le chemin,
sauf instruction contraire.)  Si un fichier portant ce nom existe déjà,
vous en serez averti avant que le fichier existant soit écrasé.

Un rapport signal sur bruit d’environ 100 est recommandé pour une
classification précise des étoiles, mais des valeurs plus faibles
peuvent suffire pour certains types spectraux.  Un rapport signal sur
bruit de seulement 10 peut suffire pour déterminer la vitesse radiale
(z) de certaines galaxies.  Si vous n’êtes pas sûr que le spectre que
vous obtenez soit suffisant, et que vous vouliez peut-être revenir au
panneau de commande du spectromètre pour poursuivre l’intégration,
utilisez la technique suivante :

    1)  Enregistrez le spectre.

    2)  Ne fermez PAS le panneau de commande du spectromètre.  Si vous
        le souhaitez, vous pouvez le réduire avec la case « _ » en haut
        à droite, mais ce n’est pas nécessaire.

    3)  Choisissez l’outil de classification ou de mesure sous
        « Outils » (Tools) dans le menu du panneau de commande de
        l’observatoire.  Chargez le fichier que vous venez
        d’enregistrer et essayez de le classer ou de le mesurer.

    4)  Si le spectre est trop bruité pour une analyse précise, vous
        pouvez poursuivre l’intégration.  Revenez au panneau de
        commande du spectromètre et appuyez sur « Démarrer ».  Quand
        vous avez terminé, vous devrez l’enregistrer de nouveau (vous
        pouvez écraser l’ancienne version) et le recharger dans l’outil
        d’analyse.

Rubriques connexes :
    Fermer le panneau de commande du spectromètre
    Accéder à l’outil de classification
    Accéder à l’outil de mesure des spectres

**Fermer le panneau de commande du spectromètre**
Pour fermer le panneau de commande du spectromètre et revenir au
panneau de commande du télescope, choisissez « Fichier » (File)->
« Quitter le spectromètre » (Exit Spectrometer) dans le menu, ou
utilisez la case « X » en haut à droite.  Si vous fermez le
spectromètre, vous ne pouvez pas revenir poursuivre l’intégration d’un
spectre là où vous l’aviez laissée, mais vous pouvez recommencer avec
la même étoile.  Si vous n’avez pas enregistré votre spectre actuel,
vous serez averti et aurez la possibilité de le faire avant la
fermeture du panneau de commande du spectromètre.

Rubriques connexes :
    Enregistrer le spectre pour l’analyse

**Accéder à l’outil de classification**
Pour classer des spectres, vous devez accéder à l’outil de
classification.  Choisissez « Outils » (Tools)->« Outil de
classification spectrale » (Spectral Classification Tool) dans le menu
du panneau de commande de l’observatoire, et l’outil de classification
apparaît.  Il n’est pas nécessaire d’accéder au panneau de commande du
télescope ni de le fermer avant d’accéder à l’outil de classification.

Rubriques connexes :
    Enregistrer le spectre pour l’analyse
    Rubriques sous « Aide » (Help) dans le menu de l’outil de
    classification.

**Accéder à l’outil de mesure des spectres**
Pour mesurer la position des raies spectrales afin de déterminer la
vitesse radiale (z), vous devez accéder à l’outil de mesure des
spectres.  Choisissez « Outils » (Tools)->« Outil de mesure des
spectres » (Spectrum Measuring Tool) dans le menu du panneau de
commande de l’observatoire, et l’outil de mesure apparaît.  Il n’est pas
nécessaire d’accéder au panneau de commande du télescope ni de le
fermer avant d’accéder à l’outil de mesure des spectres.

Rubriques connexes :
    Enregistrer le spectre pour l’analyse
    Rubriques sous « Aide » (Help) dans le menu de l’outil de mesure des
    spectres.
`;
