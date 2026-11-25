import type {TOUR_EN} from '../../../help/tour';
import type {Translation} from '../../maps';
/** Front FR0: French (fr) for the first-visit tour. A web adaptation by OpenVireo, not CLEA's. */
export const TOUR_FR:Translation<typeof TOUR_EN>=Object.freeze({
 label:'Visite guidée d’OpenVireo',
 progress:(n:number,of:number)=>`Étape ${n} sur ${of}`,
 next:'Suivant',back:'Précédent',skip:'Passer la visite',done:'Commencer à explorer',
 firstLook:'Jeter un premier coup d’œil (environ 3 min)',chooseLab:'Choisir un TP',
 steps:Object.freeze({
  welcome:Object.freeze({title:'Bienvenue sur OpenVireo',
   text:'OpenVireo est un observatoire virtuel pour des exercices d’astronomie, reconstruit dans le navigateur à partir du VIREO du Project CLEA. Cette courte visite montre où se trouvent les choses. Elle dure moins d’une minute.'}),
  save:Object.freeze({title:'Enregistrez votre travail dans un fichier',
   text:'Votre travail reste dans cet onglet du navigateur tant que vous ne l’avez pas enregistré. Enregistrer l’investigation, en haut de chaque page, télécharge un fichier ; Restaurer l’investigation (JSON), dans le menu à côté, le recharge plus tard.'}),
  help:Object.freeze({title:'L’aide est toujours là',
   text:'Ouvrez Aide pour accéder aux rubriques d’aide, ou appuyez sur la touche ? n’importe où en dehors d’un champ de texte. Vous pouvez refaire cette visite depuis le menu Aide.'}),
  start:Object.freeze({title:'Comment voulez-vous commencer ?',
   text:'Jetez un premier coup d’œil de trois minutes au ciel, ou choisissez l’un des sept TP ; chaque TP a un guide qui vous accompagne. Toutes les pages sont dans le menu ; sur un téléphone, il se trouve derrière le bouton Menu.'}),
 }),
});
