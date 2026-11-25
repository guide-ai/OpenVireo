import type {TOUR_EN} from '../../../help/tour';
import type {Translation} from '../../maps';
/** Front ES1: Spanish (es-419) for the first-visit tour. A web adaptation by OpenVireo, not CLEA's. */
export const TOUR_ES:Translation<typeof TOUR_EN>=Object.freeze({
 label:'Recorrido por OpenVireo',
 progress:(n:number,of:number)=>`Paso ${n} de ${of}`,
 next:'Siguiente',back:'Atrás',skip:'Saltar el recorrido',done:'Empezar a explorar',
 firstLook:'Dar un primer vistazo (unos 3 min)',chooseLab:'Elegir una práctica',
 steps:Object.freeze({
  welcome:Object.freeze({title:'Te damos la bienvenida a OpenVireo',
   text:'OpenVireo es un observatorio virtual para ejercicios de astronomía, reconstruido en el navegador a partir de VIREO de Project CLEA. Este breve recorrido te muestra dónde está cada cosa. Toma menos de un minuto.'}),
  save:Object.freeze({title:'Guarda tu trabajo como archivo',
   text:'Tu trabajo se queda en esta pestaña del navegador hasta que lo guardes. Guardar investigación, arriba en cada página, descarga un archivo; Restaurar investigación (JSON), en el menú de al lado, lo vuelve a cargar más tarde.'}),
  help:Object.freeze({title:'La ayuda siempre está aquí',
   text:'Abre Ayuda para ver los temas de ayuda, o presiona la tecla ? en cualquier lugar fuera de un campo de texto. Puedes volver a hacer este recorrido desde el menú Ayuda.'}),
  start:Object.freeze({title:'¿Cómo quieres empezar?',
   text:'Da un primer vistazo de tres minutos al cielo o elige una de las siete prácticas; cada práctica tiene una guía que te acompaña. Todas las páginas están en el menú; en un celular, está detrás del botón Menú.'}),
 }),
});
