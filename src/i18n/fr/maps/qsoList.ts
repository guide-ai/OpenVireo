import {HST_ARCHIVE} from '../../../core/observatoryMenuLiterals';
import type {QSO_LIST_MESSAGES_EN} from '../../../observatory/QsoListMessages';
import type {Translation} from '../../maps';
/** Front FR1: French (fr) for the QSO List and the HST Image Archive item. A web adaptation by OpenVireo, not CLEA's. */
export const QSO_LIST_FR:Translation<typeof QSO_LIST_MESSAGES_EN>=Object.freeze({
 virtualObservatoryLabel:'Observatoire virtuel (enseignant, VIREO)',
 virtualObservatoryAdaptation:'Adaptation web : dans VIREO, cette option enseignant, désactivée par défaut, active Exécuter l’exercice (Run Exercise) › Observatoire virtuel (Virtual Observatory) (tous les instruments), le mode dans lequel les étudiants disposent de Fichier (File) › Liste de QSO (QSO List). Ici, elle ne s’ouvre qu’en mode enseignant (la forme web du Mode démonstration, Demonstration Mode, sans mot de passe) ; elle est désactivée par défaut, la page ne l’enregistre pas (seul Enregistrer les modifications [Save Updates] l’écrit, dans un fichier d’options que vous conservez), Quitter la désactive et son seul effet est d’afficher Fichier › Liste de QSO.',
 sortDisabled:'Options de tri (Sort Options) n’est disponible qu’en Mode édition (Edit Mode), comme dans VIREO ; sans lui, la liste est triée par magnitude.',
 limitLabel:'Magnitude limite, V',
 withheld:'Les lignes proches des cibles de l’Objet X ne sont pas listées, afin que la liste ne puisse pas révéler ce qu’est une cible de l’Objet X non révélée (règle web ; VIREO n’affiche cette liste que dans son mode Observatoire virtuel [Virtual Observatory] ou, pendant l’Objet X, en Mode édition [Edit Mode]).',
 editModeColumns:'Colonnes du Mode édition (Edit Mode) : z est le décalage vers le rouge du catalogue ; B−V et U−B entre parenthèses sont des couleurs moyennes attribuées. Aucune cible d’exercice ne figure dans cette liste.',
 noActivate:'Un double-clic sur une ligne ne fait rien, comme dans VIREO ; utilisez Sélection (Selection) pour ajouter un QSO à la liste d’objets.',
 csvDisabled:'Séparé par des virgules (Comma Delimit) est désactivé pour cette liste dans VIREO.',
 modeless:'La liste reste ouverte pendant que vous observez ; choisissez de nouveau Fichier (File) › Liste de QSO (QSO List) pour changer la limite ou l’ordre.',
 printStudent:'Adaptation web : sans le Mode édition (Edit Mode), VIREO imprime le numéro de la table de laboratoire et les noms des étudiants sous la date ; ce site n’enregistre ni l’un ni l’autre, il imprime donc le « (non consigné) » de VIREO et aucun nom.',
 fileError:(reason:string)=>`Adaptation web : la copie incluse ${reason}.`,
 fileReasons:Object.freeze({download:'n’a pas pu être téléchargée',size:'n’a pas sa taille enregistrée',sha256:'ne correspond pas à son SHA-256 enregistré'}),
 objectXUnavailable:'La liste de QSO ne peut pas être affichée : les positions des cibles de l’Objet X n’ont pas pu être chargées et, sans elles, la liste pourrait révéler une cible non révélée.',
 loading:'Chargement du catalogue de QSO…',
 noSelection:'Sélectionnez d’abord une ligne de QSO.',
 hst:Object.freeze({
  newTab:'(site externe, s’ouvre dans un nouvel onglet)',
  note:`Adaptation web : VIREO ouvrait ${HST_ARCHIVE.defaultUrl} (le « ${HST_ARCHIVE.optionsLabel} » des options de fichier [File Options] de VIREO) dans une fenêtre de navigateur. Cette page n’existe plus ; ce lien ouvre son équivalent actuel sur hubblesite.org, que la NASA propose désormais comme sa galerie d’images Hubble (Hubble Images). Rien n’est envoyé avec lui.`,
 }),
});
