import type {CLUSTER_DATA_MESSAGES_EN} from '../../../clusterdata/ClusterDataMessages';
import type {Translation} from '../../maps';
/** Front FR4: French (fr) for the File › Cluster Data... web texts (Front K). A web adaptation by OpenVireo, not CLEA's.
 * VIREO's own captions and messages are rendered through vireo() and originals.json, not here. */
export const CLUSTER_DATA_FR:Translation<typeof CLUSTER_DATA_MESSAGES_EN>=Object.freeze({
 menuNote:'VIREO affiche Fichier (File) › Données d’amas... dans ses modes photométrie, diagramme HR et tous instruments ; ce site n’a pas de modes, l’élément est donc toujours là.',
 groupsDisabled:'Type de liste (Type of Listing) et Trier par (Sort By) sont des réglages enseignant (Mode édition [Edit Mode]) dans VIREO ; sans le Mode édition, la liste est la liste de repérage de l’étudiant, triée par AD.',
 useTelescopeOff:'Utiliser les coordonnées du télescope (Use Telescope Coordinates) exige la coupole ouverte et le suivi activé, comme VIREO exige l’entraînement du télescope en marche.',
 loading:'Chargement des données d’amas…',loadError:'Les données d’amas n’ont pas pu être chargées.',
 unavailableCaption:'Données d’amas',
 tileReason:Object.freeze({
  polar:'Cette liste ne peut pas être établie ici : si près d’un pôle céleste, le rectangle de VIREO autour du centre se replie d’une façon que ce site ne reproduit pas. Éloignez légèrement le centre du pôle.',
  regions:'Cette liste ne peut pas être établie ici : le rectangle couvre plus de 100 régions du catalogue, plus que VIREO n’en conserve. Utilisez un diamètre plus petit.',
  budget:'Cette liste ne peut pas être établie ici : le rectangle contient plus d’enregistrements du catalogue que ce site n’en lit à la fois. Utilisez un diamètre plus petit.',
  'band-end':'Cette liste ne peut pas être établie ici : à ce centre, VIREO lit au-delà de la fin d’un fichier du catalogue et s’arrête sur une erreur.',
  plan:'Cette liste ne peut pas être établie ici : un bloc du catalogue n’était pas là où il était attendu.',
 }),
 tileFetch:'Les blocs du catalogue de ce champ n’ont pas pu être chargés. Vérifiez la connexion et réessayez.',
 reportNoteTiles:'La liste est la requête de VIREO sur le catalogue d’étoiles-guides (Guide Star Catalog) complet (lu à partir des blocs du catalogue de ce site) au centre et au diamètre de la boîte de dialogue, filtrée par la magnitude limite. Les positions et les magnitudes sont celles du catalogue ; seuls les 16 amas publiés portent des commentaires.',
 spectral:'Cette liste ne peut pas être affichée : un code spectral de ce champ n’a pas de texte récupéré.',
 editModeColumns:'Mode édition (Edit Mode) : VIREO liste aussi, pour chaque amas, la couleur du point de retournement (turn-off) de la séquence principale, la distance, le module de distance et l’âge ; ces valeurs du catalogue ne sont pas publiées sur ce site, seul E(B−V) est donc affiché.',
 saveListUnavailable:'Enregistrer la liste (Save List) n’est pas disponible ici : VIREO écrit les enregistrements d’amas complets de 102 octets, qui comprennent des valeurs du catalogue que ce site ne publie pas.',
 noSelection:'Sélectionnez d’abord une ligne d’amas (clic gauche).',
 reportNote:'La liste est la requête de VIREO sur le champ d’amas publié, au centre et au diamètre de la boîte de dialogue (vérifiée hors ligne pour donner exactement les étoiles publiées), filtrée par la magnitude limite.',
 emptyField:'Aucune étoile de ce champ n’est aussi brillante que la magnitude limite. Après la boîte ci-dessus, VIREO ouvre quand même son rapport, avec « 0 Stars » (0 étoile) et les lignes de sa requête précédente ; ce site n’affiche aucune liste.',
 emptyUnknown:'Aucune étoile publiée de ce champ n’est aussi brillante que la magnitude limite. VIREO peut n’en avoir listé aucune ou avoir répondu « Aucune étoile trouvée dans le champ ! » (No Stars Found in Field!), selon des étoiles du catalogue que ce site ne publie pas ; aucune liste n’est donc affichée.',
 listModal:'Adaptation web : VIREO affiche cette liste dans une fenêtre séparée à côté de la boîte de dialogue ; ici, elle s’ouvre par-dessus.',
 listNote:'Double-cliquez sur une ligne (ou utilisez Obtenir les données de la sélection [Get Selection Data]) pour la copier dans Paramètres des données d’amas ; faites un clic droit sur une ligne sélectionnée pour accéder aux éléments de la liste d’objets.',
 printNote:'Adaptation web : un aperçu avant impression de la liste ; VIREO imprime en paysage en Mode édition et en portrait sinon.',
});
