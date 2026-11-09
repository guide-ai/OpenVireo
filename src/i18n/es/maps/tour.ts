import type {TOUR_EN} from '../../../help/tour';
import type {Translation} from '../../maps';
/** Front ES1: Spanish (es-419) for the first-visit tour. A web adaptation by OpenVireo, not CLEA's. */
export const TOUR_ES:Translation<typeof TOUR_EN>=Object.freeze({
 label:'Recorrido por OpenVireo',
 progress:(n:number,of:number)=>`Paso ${n} de ${of}`,
 next:'Siguiente',back:'Atrás',skip:'Saltar el recorrido',done:'Empezar a explorar',
 steps:Object.freeze({
  welcome:Object.freeze({title:'Te damos la bienvenida a OpenVireo',
   text:'OpenVireo es un observatorio virtual para ejercicios de astronomía, reconstruido en el navegador a partir de VIREO de Project CLEA. Este breve recorrido te muestra dónde está cada cosa. Toma menos de un minuto.'}),
  sections:Object.freeze({title:'Todas las páginas están en el menú',
   text:'Las páginas se agrupan en secciones: los observatorios óptico y de radio, las herramientas de análisis, los resultados y los archivos. Haz clic en el nombre de una sección para abrirla o cerrarla. En un celular, el menú está detrás del botón Menú.'}),
  guides:Object.freeze({title:'¿Vas a hacer un ejercicio? Empieza por su guía',
   text:'Cada ejercicio tiene una guía que enumera todos los pasos, marca lo que ya hiciste y te lleva a la página correcta.'}),
  observatory:Object.freeze({title:'O explora el cielo libremente',
   text:'En la página Observatorio: abre la cúpula, elige un objeto y apunta el telescopio. Después activa el seguimiento y usa un instrumento.'}),
  save:Object.freeze({title:'Guarda tu trabajo como archivo',
   text:'Tu trabajo se queda en esta pestaña del navegador hasta que lo guardes. Guardar investigación descarga un archivo; Restaurar investigación (JSON) lo vuelve a cargar más tarde.'}),
  help:Object.freeze({title:'La ayuda siempre está aquí',
   text:'Abre Ayuda para ver los temas de ayuda, o presiona la tecla ? en cualquier lugar fuera de un campo de texto. Puedes volver a hacer este recorrido desde el menú Ayuda.'}),
 }),
});
