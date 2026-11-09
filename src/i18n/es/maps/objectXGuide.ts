import type {OBJECT_X_GUIDE_EN} from '../../../objectx/ObjectXMessages';
import type {Translation} from '../../maps';
/** Front ES9: Spanish (es-419) for the E08 guide. A web adaptation by OpenVireo, not CLEA's. The observatory names it quotes are
 * the Spanish of the observatory's own buttons (ES2: Escribir coordenadas, Apuntar a las coordenadas, Campo de visión ›
 * Telescopio · 15′, Mover al objeto seleccionado). */
export const OBJECT_X_GUIDE_ES:Translation<typeof OBJECT_X_GUIDE_EN>=Object.freeze({
 eyebrow:'Guía del ejercicio E08',title:'En busca del Objeto X',
 intro:'Solo recibes un identificador y coordenadas. Usa los instrumentos para decidir qué tipo de objeto es y luego revela su identidad. Los pasos se actualizan a medida que trabajas; nada juzga tu respuesta antes de la revelación.',
 counts:(done,total,images)=>`${done} de ${total} pasos · ${images} imágenes de tu objeto`,
 done:'(hecho)',todo:'(pendiente)',
 steps:Object.freeze({
  target:['Obtén tu objeto','En la página del Objeto X, escribe tu ID y elige o recibe un código de objeto.'],
  clock:['Fija la fecha y la hora','Fija el reloj del observatorio; el ejercicio original empieza el 2009-06-01 a las 04:00 UT.'],
  list:['Construye la lista de asteroides','La lista de asteroides observables para esa fecha se construye cuando fijas el reloj, así que tus imágenes los incluyen; vuelve a construirla solo después de cambiar el archivo de órbitas o la magnitud límite.'],
  image:['Toma una imagen del campo','Copia las coordenadas al observatorio, abre la cúpula, abre Escribir coordenadas y haz clic en Apuntar a las coordenadas (no en Mover al objeto seleccionado), elige Campo de visión › Telescopio · 15′, activa el seguimiento y toma una imagen CCD (sin filtro y con 2 minutos es más fácil ver un objeto débil).'],
  repeat:['Toma otra imagen más tarde','Toma una segunda imagen del mismo campo 30–60 minutos después: escribe la hora posterior en la página del Objeto X y haz clic en Fijar el reloj del observatorio; luego vuelve al observatorio. Un objeto rápido deja una estela corta durante una exposición larga. En una noche posterior, la lista de asteroides se reconstruye para la nueva fecha cuando fijas el reloj, y un asteroide rápido cercano a la Tierra (más de 2° por día) habrá salido del campo: búscalo alrededor de su primera posición.'],
  measure:['Compara con el parpadeo y mide','Compara las dos imágenes con el parpadeo. Si algo se movió, mídelo en ambas para obtener su velocidad y su dirección. Los objetos fuera del sistema solar no se mueven.'],
  classify:['Decide qué es','Si nada se movió, escucha si hay pulsos con el radiotelescopio y toma un espectro (Espectrómetro o Multi-Spec en la página del Objeto X) para distinguir una estrella, una galaxia y un cuásar; puedes guardarlo como .SSP y clasificarlo.'],
  describe:['Describe tu evidencia','Escribe lo que viste con cada instrumento.'],
  reveal:['Revela la identidad','Revela el objeto y compáralo con tu respuesta.'],
  save:['Guarda tu investigación','Usa Guardar investigación en la barra de herramientas; conserva también los archivos FITS de tus imágenes.'],
 }),
 progress:'Tu progreso',go:'Ir al Objeto X',goObservatory:'Ir al observatorio',
 close:'Cerrar la guía del Objeto X',return:'Volver',
});
