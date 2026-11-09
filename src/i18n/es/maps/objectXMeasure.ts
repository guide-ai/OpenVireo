import type {OBJECT_X_MEASURE_EN} from '../../../objectx/ObjectXMessages';
import type {Translation} from '../../maps';
/** Front ES9: Spanish (es-419) for the E08 position-measuring tool (blink, centroids, plate solution, motion). A web adaptation by
 * OpenVireo, not CLEA's. Nothing here names or describes a target. */
export const OBJECT_X_MEASURE_ES:Translation<typeof OBJECT_X_MEASURE_EN>=Object.freeze({
 title:'Medir posiciones',
 intro:'Compara dos imágenes con el parpadeo para encontrar lo que se movió y luego haz clic en una fuente para medirla. Para una solución astrométrica, marca al menos tres estrellas de referencia con coordenadas de catálogo en una imagen, o usa las coordenadas de imagen escritas en su encabezado.',
 adaptation:'Adaptación web: el programa original envía las imágenes al CLEA Astrometry Toolkit, un programa externo de astrometría. Esta herramienta sigue la guía de usuario de ese programa (el píxel más brillante a menos de 8 píxeles, pesos al cubo, seis constantes de placa) y no reproduce su código.',
 frame:(n,label)=>`Imagen ${n}: ${label}`,noFrames:'No hay imágenes cargadas.',
 blinkStart:'Iniciar el parpadeo',blinkStop:'Detener el parpadeo',blinkInterval:'Intervalo de parpadeo (ms)',showFrame:'Mostrar imagen',
 roleTarget:'Objetivo',roleReference:'Estrella de referencia',roleLegend:'La próxima marca es',
 refRa:'AR del catálogo (h m s)',refDec:'Dec del catálogo (° ′ ″)',refInvalid:'Escribe la AR de la estrella de referencia como h m s y la Dec como ° ′ ″.',
 cursor:(x,y)=>`Cursor x ${x}, y ${y}`,measure:'Medir en el cursor',viewport:'Imagen; las flechas mueven el cursor y Enter mide',
 keyboardHelp:'Las flechas mueven el cursor un píxel (con Shift, diez). Enter o la barra espaciadora miden.',
 rangeLow:'Corte bajo',rangeHigh:'Corte alto',
 rangeNote:'Los cortes fijan a la vez el contraste de la vista y los pesos del centroide (valores predeterminados de la web: el bajo en el nivel del cielo, la mediana de la imagen; el alto en el 50 % del rango de la imagen). Si la medición no encuentra ninguna fuente por encima del corte bajo, reduce el corte bajo o toma una exposición más larga.',
 blinkAligned:'El parpadeo está alineado con las dos primeras estrellas de referencia de cada imagen.',
 blinkRaw:'El parpadeo alterna las imágenes en bruto (se supone la misma posición del telescopio); marca dos estrellas de referencia en cada imagen para alinearlas.',
 plateTitle:'Soluciones astrométricas',plateFrame:(n,refs)=>`Imagen ${n}: ${refs} estrellas de referencia`,plateNone:(n,refs)=>`Imagen ${n}: ${refs} estrellas de referencia (se necesitan al menos 3)`,
 plateDegenerate:n=>`Imagen ${n}: las estrellas de referencia están casi alineadas.`,plateRms:(rms,scale)=>`rms ${rms}″, escala ${scale}″/píxel`,colResidual:'Residuo (″)',
 table:'Mediciones',colFrame:'Imagen',colRole:'Marca',colX:'x',colY:'y',colRa:'AR',colDec:'Dec',colUt:'UT',colMethod:'Solución',remove:'Quitar',
 notSolved:'sin resolver',methodPlate:'constantes de placa',methodWcs:'WCS del encabezado',
 motion:(rate,pa,arcsec,hours)=>`Movimiento: ${rate}″/h hacia el ángulo de posición ${pa}° (${arcsec}″ en ${hours} h).`,
 motionNone:'Mide el objetivo en dos imágenes tomadas en momentos distintos para obtener su movimiento.',
 errors:Object.freeze({bounds:'El cursor está fuera de la imagen.',range:'El corte bajo debe ser menor que el corte alto.','no-signal':'No hay ninguna fuente por encima del corte bajo cerca del cursor.',references:'Hay demasiadas marcas; quita algunas primero.',degenerate:'Las estrellas de referencia están casi alineadas; elige otras.',wcs:'Esta imagen no tiene un encabezado de coordenadas utilizable.',time:'Las dos imágenes tienen la misma hora.'}),
});
