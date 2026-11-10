import type {CLUSTER_DATA_MESSAGES_EN} from '../../../clusterdata/ClusterDataMessages';
import type {Translation} from '../../maps';
/** Front ES7: Spanish (es-419) for the File › Cluster Data… web texts (Front K). A web adaptation by OpenVireo, not CLEA's.
 * VIREO's own captions and messages are rendered through vireo() and originals.json, not here. */
export const CLUSTER_DATA_ES:Translation<typeof CLUSTER_DATA_MESSAGES_EN>=Object.freeze({
 menuNote:'VIREO muestra Archivo (File) › Datos de cúmulos... (Cluster Data...) en sus modos de fotometría, de diagrama HR y de todos los instrumentos; este sitio no tiene modos, así que siempre está aquí.',
 groupsDisabled:'Tipo de lista (Type of Listing) y Ordenar por (Sort By) son ajustes del instructor (Modo de edición [Edit Mode]) en VIREO; sin el Modo de edición la lista es la lista de búsqueda del estudiante, ordenada por AR.',
 useTelescopeOff:'Usar las coordenadas del telescopio (Use Telescope Coordinates) necesita la cúpula abierta y el seguimiento activado, igual que VIREO necesita el accionamiento del telescopio encendido.',
 loading:'Cargando los datos de cúmulos…',loadError:'No se pudieron cargar los datos de cúmulos.',
 unavailableCaption:'Datos de cúmulos',
 tileReason:Object.freeze({
  polar:'No se puede hacer esta lista aquí: tan cerca de un polo celeste, el rectángulo de VIREO alrededor del centro se pliega de una manera que este sitio no reproduce. Aleja un poco el centro del polo.',
  regions:'No se puede hacer esta lista aquí: el rectángulo abarca más de 100 regiones del catálogo, más de las que VIREO conserva. Usa un diámetro menor.',
  budget:'No se puede hacer esta lista aquí: el rectángulo contiene más registros del catálogo de los que este sitio lee a la vez. Usa un diámetro menor.',
  'band-end':'No se puede hacer esta lista aquí: con este centro VIREO lee más allá del final de un archivo del catálogo y se detiene con un error.',
  plan:'No se puede hacer esta lista aquí: un fragmento del catálogo no estaba donde se esperaba.',
 }),
 tileFetch:'No se pudieron cargar los fragmentos del catálogo de este campo. Revisa la conexión y vuelve a intentarlo.',
 reportNoteTiles:'La lista es la consulta de VIREO al catálogo completo de estrellas guía (Guide Star Catalog), leído de los fragmentos del catálogo de este sitio, en el centro y el diámetro del cuadro de diálogo, filtrada por el límite de magnitud. Las posiciones y las magnitudes son las del catálogo; solo los 16 cúmulos publicados llevan comentarios.',
 spectral:'No se puede mostrar esta lista: un código espectral de este campo no tiene texto recuperado.',
 editModeColumns:'Modo de edición (Edit Mode): VIREO también lista, de cada cúmulo, el color del punto de desvío de la secuencia principal, la distancia, el módulo de distancia y la edad; esos valores del catálogo no se publican en este sitio, así que solo se muestra E(B−V).',
 saveListUnavailable:'Guardar lista (Save List) no está disponible aquí: VIREO escribe los registros completos de cúmulos de 102 bytes, que incluyen valores del catálogo que este sitio no publica.',
 noSelection:'Primero selecciona la fila de un cúmulo (clic izquierdo).',
 reportNote:'La lista es la consulta de VIREO al campo publicado del cúmulo en el centro y el diámetro del cuadro de diálogo (comprobada sin conexión para dar exactamente las estrellas publicadas), filtrada por el límite de magnitud.',
 emptyField:'Ninguna estrella de este campo es tan brillante como el límite de magnitud. Tras el cuadro de arriba, VIREO abre de todos modos su informe, con “0 Stars” (0 estrellas) y las filas de su consulta anterior; este sitio no muestra ninguna lista.',
 emptyUnknown:'Ninguna estrella publicada de este campo es tan brillante como el límite de magnitud. Puede que VIREO no haya listado ninguna o que haya respondido “¡No se encontraron estrellas en el campo!” (“No Stars Found in Field!”), según estrellas del catálogo que este sitio no publica, así que no se muestra ninguna lista.',
 listModal:'Adaptación web: VIREO muestra esta lista en una ventana aparte junto al cuadro de diálogo; aquí se abre encima de él.',
 listNote:'Haz doble clic en una fila (o usa Obtener los datos de la selección [Get Selection Data]) para copiarla a Parámetros de datos de cúmulos (Cluster Data Parameters); haz clic derecho en una fila seleccionada para ver las opciones de la lista de objetos.',
 printNote:'Adaptación web: una vista previa de impresión de la lista; VIREO imprime en horizontal en el Modo de edición y en vertical en los demás casos.',
});
