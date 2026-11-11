import type {HELP_MENU_EN} from '../../../help/HelpMessages';
import type {Translation} from '../../maps';
/** Front FR0: French (fr) for OpenVireo's own text in the Help menus. VIREO's menu captions (Help, Topics..., Websites…)
 * are originals (originals.json). A web adaptation by OpenVireo, not CLEA's. */
export const HELP_MENU_FR:Translation<typeof HELP_MENU_EN>=Object.freeze({
 newTab:'(s’ouvre dans un nouvel onglet)',
 noEquivalent:(original:string)=>`— VIREO ouvrait ${original}. Ce site n’existe plus et il n’y a pas de page équivalente ; aucun lien n’est donc proposé.`,
 websitesNote:'VIREO ouvrait ces pages dans une nouvelle fenêtre du navigateur. Ici, elles s’ouvrent dans un nouvel onglet uniquement lorsque vous cliquez dessus, et rien n’est envoyé. Deux des adresses de VIREO n’existent plus : 2MASS (xena.harvard.edu) ouvre la page actuelle de 2MASS de l’IRSA (NASA/IPAC), et NVO (www.us-vo.org) ouvre la page de son successeur, le NAVO (NASA Astronomical Virtual Observatories), les observatoires virtuels astronomiques de la NASA.',
 reminderLoading:'Chargement du rappel de VIREO…',
 reminderError:'Le fichier de rappel de VIREO (Reminder.obs) n’a pas pu être chargé ou ne correspondait pas à sa taille et à son SHA-256 enregistrés.',
 ok:'OK',cancel:'Annuler',close:'Fermer',yes:'Oui',no:'Non',
 menuName:Object.freeze({main:'Menu Aide de l’observatoire',radio:'Menu Aide du radiotélescope'}),
 radioOff:'Le menu Aide radio de VIREO (Rubriques..., À propos de cet exercice...) se trouve sur le panneau de commande du radiotélescope, qui s’ouvre quand vous allumez le télescope.',
 reminderErrorQuestion:'VIREO pose alors cette question à la place :',
 exitDone:'Vous avez terminé le TP. Une page web ne peut pas se fermer toute seule : enregistrez votre travail, puis fermez cet onglet du navigateur quand vous le souhaitez.',
 siteAbout:'À propos d’OpenVireo et de la confidentialité',
 webTopics:'Rubriques d’aide…',
 tour:'Faire la visite guidée du site',
 shortcutKey:'?',
 buttonNames:Object.freeze({
  'OBSRVHLP.LST':'Aide des commandes du télescope','PHOTOHLP.LST':'Aide du photomètre','CAMHLP.LST':'Aide de la caméra','SPECHLP.LST':'Aide du spectromètre',
  'CLASSHLP.LST':'Aide de la classification spectrale','MEASHLP.LST':'Aide de la mesure des spectres','HRANALHLP.LST':'Aide du diagramme HR','VARTYPEHLP.LST':'Aide des types d’étoiles variables',
  'WDGPLTHLP.LST':'Aide du diagramme en cône','PLSANHLP.LST':'Aide de l’analyse des pulsars','PLSLSHLP.LST':'Aide des paramètres des pulsars','MLTSPHLP.LST':'Aide du spectromètre multi-objets',
  'SPLSTHLP.LST':'Aide de la liste de spectres multi-objets',
 }),
 exitNote:'VIREO affiche ce rappel quand vous quittez l’observatoire pendant un exercice, après Exécuter l’exercice (Run Exercise) ; sinon, il demande seulement si vous voulez quitter. OpenVireo n’a pas d’étape Se connecter (Log In) ni Exécuter l’exercice, de sorte que l’observatoire est toujours un exercice en cours. Dans VIREO, OK ou Oui (Yes) quitte le programme ; Annuler (Cancel) ou Non (No) le laisse ouvert.',
});
