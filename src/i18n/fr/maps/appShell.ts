import type {APP_SHELL_MESSAGES_EN} from '../../../components/AppShellMessages';
import type {Translation} from '../../maps';
/** Front FR0: French (fr) for the app shell: navigation groups, theme switch, toolbar disclosure, the page bar and the recovery notice
 * of a part of the site that cannot load. A web adaptation by OpenVireo, not CLEA's. */
export const APP_SHELL_FR:Translation<typeof APP_SHELL_MESSAGES_EN>=Object.freeze({
 theme:Object.freeze({legend:'Thème de couleurs',system:'Système',light:'Clair',dark:'Sombre'}),
 navGroups:Object.freeze({optical:'Observatoire optique',radio:'Observatoire radio',analysis:'Analyse',files:'Fichiers',guides:'Guides des TP'}),
 backupHelpSummary:'Ce que contient une sauvegarde',
 toolsMenu:'Menu',// the phone menu button; "Outils" does not fit beside the brand and Help at 320 px
 skipToContent:'Aller au contenu',
 pageBar:Object.freeze({label:'Investigation, langue et aide',more:'Plus',moreName:'Plus d’actions sur l’investigation'}),
 companion:Object.freeze({label:'Étape en cours du guide',stepOf:(n:number,total:number)=>`Étape ${n} sur ${total}`,actions:'Actions du guide',show:'Me montrer où',details:'Détails de l’étape',full:'Guide complet',hide:'Masquer',hideName:'Masquer ce guide',notYet:'Ce contrôle n’est pas encore à l’écran ; il apparaît après une action précédente. Vous êtes sur la bonne page.',allDone:'Toutes les étapes sont terminées.',
  restart:'Recommencer le TP',restartTitle:'Recommencer ce TP ?',restartWhat:'Le site se recharge et ce guide s’ouvre à sa première étape.',
  restartLost:'Tout ce que vous n’avez pas enregistré est perdu : le travail de ce TP et celui de tout autre outil de cet onglet.',
  restartSave:'Pour le conserver, annulez et choisissez d’abord Enregistrer l’investigation.',restartConfirm:'Recommencer',restartCancel:'Annuler'}),
 firstLook:Object.freeze({name:'Premier aperçu',dome:'Ouvrez la coupole',point:'Choisissez la galaxie M82 et pointez le télescope vers elle',look:'Regardez-la au télescope',
  spectrum:'Ouvrez son spectre',spectrumDetail:'Seuls certains objets ont un spectre dans la bibliothèque de VIREO ; M82 en a un. C’est le spectre de la bibliothèque d’origine de VIREO, pas une nouvelle observation.',
  closing:'Vous avez jeté un premier coup d’œil. Choisissez un TP pour aller plus loin.',start:'Me guider (environ 3 min)',help:'Jeter un premier coup d’œil'}),
 recovery:Object.freeze({
  updatedTitle:'Une nouvelle version d’OpenVireo a été publiée',
  updated:'Cette partie du site n’a pas pu être chargée, car le site a été mis à jour pendant que cette page était ouverte.',
  errorTitle:'Cette partie d’OpenVireo s’est arrêtée à cause d’une erreur',
  error:'Recharger la page règle généralement le problème. Si cela se reproduit, notez ce que vous avez fait juste avant.',
  kept:'Le reste du site et vos autres travaux dans cet onglet sont toujours là.',
  saveFirst:'Enregistrez d’abord votre investigation, puis rechargez la page pour continuer avec la version actuelle.',
  saveHow:'Rechargez la page pour continuer. Le travail que vous avez enregistré plus tôt avec Enregistrer l’investigation pourra ensuite être restauré avec Restaurer l’investigation (JSON).',
  save:'Enregistrer l’investigation',
  reload:'Recharger la page',
 }),
});
