import type {WEB_HELP_EN} from '../../../help/webHelp';
import type {Translation} from '../../maps';
/** Front FR-HELP: French (fr) for OpenVireo's own help topics (Aide › Rubriques d’aide…). The labels quoted from OpenVireo's screen
 * are the French ones the interface already shows; VIREO's own menu names come from originals.json. A web adaptation by OpenVireo,
 * not CLEA's. Text only: the topic ids, block kinds and related links are the English source's (webHelp.ts). */
const p=(text:string)=>text;
const steps=(...items:string[])=>items;
const list=(...items:string[])=>items;
const topic=(title:string,blocks:readonly (string|readonly string[]|{head:readonly string[];rows:readonly (readonly string[])[]})[])=>({title,blocks});

const START={title:'Pour commencer',topics:[
 topic('Ce qu’est OpenVireo',[
  p('OpenVireo est une version pour navigateur de VIREO, l’Observatoire virtuel éducatif du Project CLEA (Gettysburg College). Il est reconstruit à partir du comportement retrouvé de VIREO et de ses fichiers de données d’origine ; ce n’est pas le programme du CLEA lui-même.'),
  p('Rien n’est installé, et il n’y a ni connexion ni compte. Tout fonctionne dans cet onglet du navigateur, et votre travail reste dans l’onglet jusqu’à ce que vous l’enregistriez dans un fichier sur votre ordinateur. À l’écran, les nombres utilisent le point décimal et une espace fine entre les milliers (par exemple 1.5 et 24 000) ; saisissez aussi les décimales avec un point. Les fichiers enregistrés par le site restent en anglais, comme VIREO les écrit.'),
  p('La version 1.0 contient les sept exercices de VIREO : la loi de Hubble, la structure à grande échelle (LSS), la classification stellaire, la photométrie des Pléiades, les diagrammes HR d’amas, les pulsars et la quête de l’Objet X. Chacun a un guide sous Guides des TP, dans l’en-tête.'),
 ]),
 topic('Premiers pas',[
  p('Si vous faites l’un des exercices, pour un cours ou de votre propre initiative, ouvrez d’abord son guide : il liste chaque étape et vous mène à la bonne page. Pour explorer librement :'),
  steps(
   'Ouvrez Observatoire dans l’en-tête (groupe Observatoire optique).',
   'Appuyez sur Ouvrir la coupole.',
   'Dans Choisir un objet, choisissez une cible dans la liste (ou tapez dans Rechercher dans le catalogue), puis appuyez sur Pointer le télescope.',
   'Ouvrez Horloge de l’observatoire et suivi spectral et appuyez sur Activer le suivi. Les caméras et les spectromètres ont besoin du suivi.',
   'Passez à la vue du télescope et utilisez un instrument : Ouvrir le spectromètre, la caméra CCD ou la caméra IR, ou Multi-Spec.',
   'Mesurez ce que vous avez acquis sur une page d’analyse, puis enregistrez votre travail (voir Enregistrer votre travail).'),
 ]),
 topic('Guides des TP',[
  p('Le groupe Guides des TP de l’en-tête a un bouton par exercice : Guide du TP Hubble, Guide LSS, Guide de l’Objet X, Guide des pulsars, Guide du TP Pléiades, Guide de classification et Guide du diagramme HR des amas.'),
  p('Un guide s’ouvre dans une fenêtre aux étapes numérotées. Une coche marque chaque étape terminée, et un bouton comme Continuer vers l’étape suivante ou Aller à l’étape suivante vous mène à la page de l’étape suivante. Fermez le guide quand vous voulez et rouvrez-le depuis l’en-tête ; votre progression est conservée tant que l’onglet reste ouvert.'),
  p('Ouvrir un guide lance aussi l’exercice, comme le faisait le choix d’un exercice dans VIREO : cela fixe les télescopes ouverts (voir Télescopes et Demander du temps) et l’affichage ou non des noms et des magnitudes des objets. Dans l’exercice de l’Objet X, l’identité de l’objet reste cachée jusqu’à ce que vous la révéliez.'),
 ]),
 topic('Si vous venez de VIREO (Windows)',[
  p('Si vous connaissez le programme Windows, ou si votre fiche d’exercice a été écrite pour lui, ce tableau indique où se trouve chaque étape de VIREO dans OpenVireo.'),
  {head:['Dans VIREO (Windows)','Dans OpenVireo'],rows:[
   ['Fichier › Se connecter...','Inutile : il n’y a ni comptes ni connexion. Les noms sur les impressions restent vides.'],
   ['Fichier › Exécuter l’exercice','Ouvrez le guide de l’exercice sous Guides des TP, dans l’en-tête.'],
   ['Fichier › Définir la date et l’heure d’observation, l’ID...','Horloge du site › Définir la date et l’heure… sur la page Observatoire (UT). La page de l’Objet X a sa propre zone de date et d’heure (Régler l’horloge de l’observatoire) ; sa zone ID identifie vos données enregistrées.'],
   ['Télescopes › Optique','La carte Télescope optique de la page Observatoire : choisissez un profil, puis Utiliser ce télescope.'],
   ['Télescopes › Optique › Demander du temps','La zone Demander du temps de la même carte (seulement dans les exercices qui restreignent les plus grands télescopes).'],
   ['Télescopes › Radio','Radiotélescope dans l’en-tête (groupe Observatoire radio).'],
   ['Interrupteur Ouvrir/Fermer de la coupole','Ouvrir la coupole / Fermer la coupole sur la page Observatoire.'],
   ['Bouton du panneau de commande du télescope','Passer à la vue du télescope, puis Déplacer le télescope et les cartes des instruments.'],
   ['Outils › (outils d’analyse)','Le groupe Analyse de l’en-tête : Analyseur de spectres, Classification stellaire, Base de données d’amas, Relevé LSS, Données LSS, Objet X, Étoiles variables ; Données radio pour les pulsars.'],
   ['Outils › Éditeurs de résultats','Le groupe Éditeurs de résultats de l’en-tête : Résultats d’observation et Résultats de pulsars.'],
   ['Charger les données enregistrées...','Restaurer l’investigation (JSON) dans le menu Plus en haut de la page, ou le bouton de chargement de l’éditeur de résultats depuis lequel vous avez enregistré.'],
   ['Outils › Tableur','Utilisez Télécharger le CSV des résultats, puis ouvrez le fichier dans n’importe quel tableur.'],
   ['Outils › Traitement d’images (DS9)','Les images des caméras sont enregistrées comme téléchargements FITS et peuvent être ouvertes sous Fichiers › Images enregistrées ou dans n’importe quelle visionneuse FITS, y compris DS9.'],
   ['Fichier › Quitter l’observatoire','Enregistrez votre travail, puis fermez l’onglet du navigateur. Le menu Fichier de Déplacer le télescope a Quitter l’observatoire, qui affiche le rappel de VIREO.'],
   ['Clavier : Alt, Verr Num et les touches souris','Les touches habituelles du navigateur : voir Menus, clavier et téléphones.'],
  ]},
 ]),
]};

const OBSERVATORY={title:'L’observatoire',topics:[
 topic('Coupole, pointage et suivi',[
  p('La page Observatoire suit trois étapes : 1 · Ouvrez la coupole, 2 · Choisissez et pointez, 3 · Explorez un instrument.'),
  list(
   'Ouvrir la coupole dévoile le ciel et active les commandes du télescope. Le champ de vue bascule entre Chercheur · 2.5° et Télescope · 15′.',
   'Choisir un objet liste des cibles suggérées, la liste de l’exercice de Hubble et toutes les cibles du catalogue ; Rechercher dans le catalogue filtre la liste (Échap l’efface). Pointer le télescope centre le télescope sur votre choix. Sous Saisir les coordonnées, Pointer vers les coordonnées pointe vers n’importe quelles ascension droite et déclinaison.',
   'Déplacer le télescope déplace le télescope tant que vous maintenez un bouton de direction (avec la souris, Espace ou Entrée). Son menu propose Définir les coordonnées…, Voir/sélectionner dans la liste… (les listes d’objets) et Ajouter l’objet ou la position actuels à la liste….',
   'Le suivi se trouve dans Horloge de l’observatoire et suivi spectral : Activer le suivi maintient le pointage pendant que l’horloge tourne. Les caméras et les spectromètres refusent de prendre des données tant que le suivi est désactivé.'),
 ]),
 topic('Télescopes et Demander du temps',[
  p('La carte Télescope optique de la page Observatoire propose les trois télescopes de VIREO : celui de 0.4 m, celui de 0.9 m du KPNO et celui de 4 m du KPNO. Choisissez-en un sous Profil de télescope à examiner ou à sélectionner et appuyez sur Utiliser ce télescope. Les menus de VIREO appellent celui de 0.9 m le télescope de 1.0 mètre.'),
  p('Dans les exercices de photométrie des Pléiades, de diagrammes HR d’amas et de classification, les plus grands télescopes sont restreints, comme dans VIREO. Une zone Demander du temps apparaît alors dans la carte, avec Demander le télescope de 1.0 mètre et Demander le télescope de 4.0 mètres. Si du temps vous est accordé, vous obtenez un nombre d’utilisations ; sinon, vous pouvez refaire une demande après quelques minutes. Celui de 0.4 m est toujours disponible, et les exercices Hubble, LSS et Objet X laissent tous les télescopes ouverts.'),
 ]),
 topic('Date, heure et site',[
  p('Horloge de l’observatoire et suivi spectral démarre et met en pause l’horloge de l’observatoire, et active ou désactive le suivi.'),
  p('Horloge du site · scénario UT fixe définit la date et l’heure d’observation avec Définir la date et l’heure… (en UT, pas en heure locale). Informations sur le site… affiche l’observatoire, et Paramètres du site… change son site pour les horloges et l’horizon. Utilisez la date et l’heure données dans votre documentation d’exercice.'),
 ]),
 topic('Instruments',[
  list(
   'Spectromètre : Ouvrir le spectromètre sur la page Observatoire, ou les pages des exercices (Pose d’étoile, Pose de galaxie, Relevé LSS, Objet X). Le bouton Spectromètre de l’en-tête indique où chaque type de spectre est pris.',
   'Photomètre : Photométrie des Pléiades dans l’en-tête.',
   'Pose du ciel, Pose d’étoile et Pose de galaxie, dans l’en-tête, prennent des spectres du fond de ciel, de l’étoile du catalogue prise en charge et des galaxies de Hubble.',
   'Caméras CCD et IR : la carte de la caméra sur la page Observatoire. Démarrer la pose prend une image ; Enregistrer l’image (FITS) la télécharge. Les champs sans liste d’étoiles fournie peuvent interroger en direct le service de catalogues VizieR (seuls les coordonnées et le rayon sont envoyés).',
   'Multi-Spec : la carte du spectromètre multiobjet sur la page Observatoire.',
   'Radiotélescope : voir Radiotélescope et pulsars.'),
  p('Chaque instrument a son propre bouton Aide. Il affiche l’aide de VIREO pour cet instrument, traduite, avec Voir l’original (anglais) ; là où le panneau d’OpenVireo diffère de celui de VIREO, le panneau lui-même porte une note web.'),
 ]),
 topic('Radiotélescope et pulsars',[
  p('Radiotélescope, dans l’en-tête, ouvre le panneau de commande du radiotélescope. Commencez par Démarrer le TP sur les pulsars, pointez un pulsar et faites l’acquisition de son signal avec le récepteur. Le panneau a son propre menu Aide, avec l’aide radio de VIREO.'),
  p('Données radio ouvre l’analyse de pulsars : mesurez la période et le retard entre les fréquences avec les curseurs, sur votre acquisition ou sur un fichier .PLR enregistré. Les mesures consignées sont perdues quand vous rechargez la page, sauf si vous les enregistrez : Enregistrer l’investigation conserve votre acquisition et vos mesures confirmées (voir Enregistrer votre travail).'),
 ]),
]};

const ANALYSIS={title:'Analyse et résultats',topics:[
 topic('Pages d’analyse',[
  list(
   'Analyseur de spectres : alignez des raies de référence sur un spectre pour mesurer son décalage vers le rouge, et conservez vos résultats.',
   'Classification stellaire : comparez un spectre aux étoiles étalons de l’atlas et choisissez son type spectral.',
   'Base de données d’amas : tracez des diagrammes HR d’amas et ajustez-y la séquence principale et des isochrones.',
   'Relevé LSS : prenez les spectres des galaxies des champs du relevé. Données LSS : tracez les décalages vers le rouge dans un diagramme en cône.',
   'Objet X : identifiez un objet inconnu à partir de son identifiant et de ses coordonnées.',
   'Étoiles variables : recherchez une étoile variable et tracez sa courbe de lumière.',
   'Données radio : mesurez des pulsars (voir Radiotélescope et pulsars).'),
 ]),
 topic('Enregistrer votre travail',[
  p('OpenVireo ne conserve rien sur un serveur. La plus grande partie de votre travail se trouve dans cet onglet et est perdue quand vous le rechargez ou le fermez : enregistrez-la donc dans un fichier sur votre ordinateur.'),
  list(
   'Enregistrer l’investigation (en haut de chaque page) télécharge un fichier avec vos spectres, vos mesures et vos réglages. Restaurer l’investigation (JSON), dans le menu voisin, recharge ce fichier plus tard ; Ce que contient une sauvegarde, dans le même menu, indique exactement ce qu’il couvre.',
   'Résultats d’observation (dans le groupe Éditeurs de résultats) ouvre vos décalages vers le rouge confirmés : Télécharger le texte des résultats, Télécharger le CSV des résultats (pour un tableur) et Imprimer les résultats.',
   'Enregistrer l’investigation conserve aussi votre acquisition de pulsar et vos mesures de pulsars confirmées. Pour un fichier .CSV, utilisez Enregistrer les mesures consignées (.CSV) dans Données radio ; Résultats de pulsars ouvre un fichier enregistré pour le revoir.',
   'Les images des caméras sont téléchargées comme fichiers FITS ; ouvrez-les sous Fichiers › Images enregistrées.',
   'Les listes d’objets s’enregistrent comme fichiers .HTL depuis l’éditeur Listes d’objets d’origine.'),
  p('Seuls le thème de couleurs, les sections du menu que vous avez laissées ouvertes, le fait que vous ayez vu la visite guidée, le fait que la touche ? ouvre l’aide, le Mode démonstration (Demonstration Mode) de l’enseignant et le carnet d’observation de la classification sont mémorisés par le navigateur lui-même.'),
 ]),
 topic('Impression',[
  p('Certains boutons d’impression, comme Imprimer les résultats et Imprimer le spectre, ouvrent directement la boîte de dialogue d’impression du navigateur. D’autres, comme Imprimer l’image du ciel... et Imprimer le diagramme en cône..., affichent d’abord un aperçu avant impression, dont le bouton Imprimer… l’ouvre. La boîte de dialogue d’impression du navigateur peut aussi enregistrer en PDF.'),
 ]),
 topic('Terminer un exercice',[
  p('Enregistrez votre investigation et tous les fichiers de résultats dont vous avez besoin pour votre compte rendu, puis fermez l’onglet du navigateur. Quitter l’observatoire, dans le menu Fichier de Déplacer le télescope, affiche le rappel de fin d’exercice de VIREO ; une page web ne peut pas se fermer elle-même : c’est donc vous qui fermez l’onglet.'),
 ]),
]};

const SITE={title:'Utiliser le site',topics:[
 topic('Menus, clavier et téléphones',[
  list(
   'Le menu regroupe toutes les pages en sections : Observatoire optique, Observatoire radio, Analyse, Éditeurs de résultats, Fichiers et Guides des TP. Cliquez sur le nom d’une section pour l’ouvrir ou la fermer ; la section de la page où vous êtes s’ouvre d’elle-même, et le navigateur mémorise les autres. Sur un téléphone, le menu se trouve derrière le bouton Menu.',
   'Aide est toujours en haut de la page, y compris sur un téléphone. Appuyez sur la touche ? n’importe où en dehors d’un champ de texte pour ouvrir ces rubriques d’aide ; vous pouvez désactiver cette touche ci-dessous.',
   'Aide › Faire la visite guidée du site relance la visite guidée proposée lors de votre première visite.',
   'Code source et Signaler un problème, au pied du menu et dans Aide, ouvrent la page d’OpenVireo sur GitHub dans un nouvel onglet. Signaler un problème ouvre un nouveau ticket dans lequel le nom de la page où vous étiez est déjà indiqué ; GitHub vous demande de vous connecter, et rien n’est envoyé avant que vous le soumettiez là-bas.',
   'Tab et Maj+Tab passent d’une commande à l’autre ; Entrée ou Espace appuie sur un bouton.',
   'Échap ferme les menus et les boîtes de dialogue.',
   'Les boutons de direction (télescope et radio) déplacent le télescope tant qu’ils sont maintenus avec la souris, Espace ou Entrée.',
   'Les curseurs de spectre se déplacent avec les touches fléchées (avec Maj, par pas plus grands) ; Entrée ou Espace applique, Échap annule.',
   'Le sélecteur de thème choisit les couleurs Système, Clair ou Sombre.'),
  'Ouvrir les rubriques d’aide avec la touche ?',
 ]),
 topic('Mode enseignant',[
  p('Mode enseignant…, dans l’en-tête, après une confirmation, ouvre, dans cet onglet du navigateur, les options enseignant de VIREO : Options de simulation optique… dans le menu de Déplacer le télescope et les préférences radio, qui sont fermées aux étudiants. Il n’a pas de mot de passe, n’est pas un verrou et n’affiche aucune réponse. Quitter le désactive.'),
 ]),
 topic('L’aide d’origine de VIREO',[
  p('Les boutons Aide de chaque instrument et outil affichent l’aide de VIREO lui-même pour cette fenêtre, traduite en français comme adaptation web d’OpenVireo ; Voir l’original (anglais) affiche le texte du programme d’origine sans modification.'),
  p('L’aide de la fenêtre principale de VIREO décrivait les menus du programme Windows, qu’OpenVireo remplace par ses propres pages ; elle n’est donc pas proposée ici : Si vous venez de VIREO (Windows) relie chacun de ces menus à sa place dans OpenVireo.'),
 ]),
]};

export const WEB_HELP_FR:Translation<typeof WEB_HELP_EN>=Object.freeze({
 caption:'Aide d’OpenVireo',
 close:'Fermer',
 navLabel:'Rubriques d’aide',
 related:'Voir aussi :',
 groups:[START,OBSERVATORY,ANALYSIS,SITE],
});
