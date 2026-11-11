import type {TOUR_EN} from '../../../help/tour';
import type {Translation} from '../../maps';
/** Front FR0: French (fr) for the first-visit tour. A web adaptation by OpenVireo, not CLEA's. */
export const TOUR_FR:Translation<typeof TOUR_EN>=Object.freeze({
 label:'Visite guidée d’OpenVireo',
 progress:(n:number,of:number)=>`Étape ${n} sur ${of}`,
 next:'Suivant',back:'Précédent',skip:'Passer la visite',done:'Commencer à explorer',
 steps:Object.freeze({
  welcome:Object.freeze({title:'Bienvenue sur OpenVireo',
   text:'OpenVireo est un observatoire virtuel pour des exercices d’astronomie, reconstruit dans le navigateur à partir du VIREO du Project CLEA. Cette courte visite montre où se trouvent les choses. Elle dure moins d’une minute.'}),
  sections:Object.freeze({title:'Toutes les pages sont dans le menu',
   text:'Les pages sont regroupées en sections : les observatoires optique et radio, les outils d’analyse, les résultats et les fichiers. Cliquez sur le nom d’une section pour l’ouvrir ou la fermer. Sur un téléphone, le menu se trouve derrière le bouton Menu.'}),
  guides:Object.freeze({title:'Vous faites un TP ? Commencez par son guide',
   text:'Chaque TP a un guide qui liste chaque étape, coche ce que vous avez fait et vous mène à la bonne page.'}),
  observatory:Object.freeze({title:'Ou explorez le ciel librement',
   text:'Sur la page Observatoire : ouvrez la coupole, choisissez un objet et pointez le télescope. Activez ensuite le suivi et utilisez un instrument.'}),
  save:Object.freeze({title:'Enregistrez votre travail dans un fichier',
   text:'Votre travail reste dans cet onglet du navigateur tant que vous ne l’avez pas enregistré. Enregistrer l’investigation, en haut de chaque page, télécharge un fichier ; Restaurer l’investigation (JSON), dans le menu à côté, le recharge plus tard.'}),
  help:Object.freeze({title:'L’aide est toujours là',
   text:'Ouvrez Aide pour accéder aux rubriques d’aide, ou appuyez sur la touche ? n’importe où en dehors d’un champ de texte. Vous pouvez refaire cette visite depuis le menu Aide.'}),
 }),
});
