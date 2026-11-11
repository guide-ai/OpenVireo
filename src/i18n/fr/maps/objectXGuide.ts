import type {OBJECT_X_GUIDE_EN} from '../../../objectx/ObjectXMessages';
import type {Translation} from '../../maps';
/** Front FR6: French (fr) for the E08 guide. A web adaptation by OpenVireo, not CLEA’s. The observatory names it quotes are the
 * French of the observatory’s own buttons (sky.coordinates: Saisir les coordonnées, sky.pointCoordinates: Pointer vers les
 * coordonnées, sky.view › sky.telescope: Champ de vue › Télescope · 15′, motion.selected: Déplacer vers l’objet sélectionné). */
export const OBJECT_X_GUIDE_FR:Translation<typeof OBJECT_X_GUIDE_EN>=Object.freeze({
 eyebrow:'Guide du TP E08',title:'La quête de l’Objet X',
 intro:'Vous recevez seulement un identifiant et des coordonnées. Utilisez les instruments pour décider de quel type d’objet il s’agit, puis révélez son identité. Les étapes se mettent à jour au fil de votre travail ; rien ne juge votre réponse avant la révélation.',
 counts:(done,total,images)=>`Étapes : ${done} sur ${total} · images de votre objet : ${images}`,
 done:'(terminée)',todo:'(à faire)',
 steps:Object.freeze({
  target:['Obtenir votre objet','Sur la page de l’Objet X, saisissez votre ID et choisissez ou recevez un code d’objet.'],
  clock:['Régler la date et l’heure','Réglez l’horloge de l’observatoire ; l’exercice d’origine commence le 2009-06-01 à 04:00 UT.'],
  list:['Construire la liste d’astéroïdes','La liste des astéroïdes observables à cette date est construite quand vous réglez l’horloge, de sorte que vos images les incluent ; ne la reconstruisez qu’après avoir changé le fichier d’orbites ou la magnitude limite.'],
  image:['Réaliser une image du champ','Copiez les coordonnées vers l’observatoire, ouvrez la coupole, ouvrez « Saisir les coordonnées » et cliquez sur « Pointer vers les coordonnées » (pas sur « Déplacer vers l’objet sélectionné »), choisissez « Champ de vue › Télescope · 15′ », activez le suivi et réalisez une image CCD (sans filtre et avec une pose de 2 minutes, un objet faible se voit plus facilement).'],
  repeat:['Réaliser une autre image plus tard','Réalisez une seconde image du même champ 30–60 minutes plus tard : saisissez l’heure ultérieure sur la page de l’Objet X et cliquez sur « Régler l’horloge de l’observatoire », puis retournez à l’observatoire. Un objet rapide laisse une courte traînée pendant une longue pose. Une autre nuit, la liste d’astéroïdes est reconstruite pour la nouvelle date quand vous réglez l’horloge, et un géocroiseur rapide (plus de 2° par jour) aura quitté le champ : cherchez-le autour de sa première position.'],
  measure:['Comparer par clignotement et mesurer','Comparez les deux images par clignotement. Si quelque chose a bougé, mesurez-le sur les deux pour obtenir sa vitesse et sa direction. Les objets extérieurs au Système solaire ne bougent pas.'],
  classify:['Décider de la nature de l’objet','Si rien n’a bougé, écoutez les impulsions avec le radiotélescope et réalisez un spectre (Spectromètre ou Multi-Spec sur la page de l’Objet X) pour distinguer une étoile, une galaxie et un quasar ; vous pouvez l’enregistrer en .SSP et le classer.'],
  describe:['Décrire vos éléments de preuve','Écrivez ce que vous avez vu avec chaque instrument.'],
  reveal:['Révéler l’identité','Révélez l’objet et comparez-le à votre réponse.'],
  save:['Enregistrer votre investigation','Utilisez « Enregistrer l’investigation » dans la barre d’outils ; conservez aussi les fichiers FITS de vos images.'],
 }),
 progress:'Votre progression',go:'Aller à l’Objet X',goObservatory:'Aller à l’observatoire',
 close:'Fermer le guide de l’Objet X',return:'Retour',
});
