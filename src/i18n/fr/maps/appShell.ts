import type {APP_SHELL_MESSAGES_EN} from '../../../components/AppShellMessages';
import type {Translation} from '../../maps';
/** Front FR0: French (fr) for the app shell: navigation groups, theme switch, toolbar disclosure, the page bar and the recovery notice
 * of a part of the site that cannot load. A web adaptation by OpenVireo, not CLEA's. */
export const APP_SHELL_FR:Translation<typeof APP_SHELL_MESSAGES_EN>=Object.freeze({
 theme:Object.freeze({legend:'Thème de couleurs',system:'Système',light:'Clair',dark:'Sombre'}),
 navGroups:Object.freeze({optical:'Observatoire optique',radio:'Observatoire radio',analysis:'Analyse',files:'Fichiers',guides:'Guides des TP'}),
 backupHelpSummary:'Ce que contient une sauvegarde',
 toolsMenu:'Menu',// the phone menu button; "Outils" does not fit beside the brand and Help at 320 px
 pageBar:Object.freeze({label:'Investigation, langue et aide',more:'Plus',moreName:'Plus d’actions sur l’investigation'}),
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
