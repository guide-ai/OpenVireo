import type {ENGINE_VIEW_EN} from '../../../SpectrumEngineMessages';
import type {Translation} from '../../maps';
/** Front ES3: Spanish (es-419) for the measuring engine's web strings (zoom window, pan and readout). A web adaptation by OpenVireo, not CLEA's. */
export const ENGINE_VIEW_ES:Translation<typeof ENGINE_VIEW_EN>=Object.freeze({
 panLeft:'Mover la ventana 100 Å a la izquierda',
 panRight:'Mover la ventana 100 Å a la derecha',
 readoutEmpty:'Arrastra en la gráfica, o enfócala y usa las teclas de flecha, para leer una longitud de onda.',
 nearest:'Línea de comparación más cercana',
 nearestNone:'No hay ninguna línea de comparación a menos de 100 Å del cursor.',
 nearestFound:(label:string,shifted:string)=>`Línea de comparación más cercana: ${label} en ${shifted} Å.`,
 plotHelp:'Gráfica del espectro. Arrastra, o usa las teclas de flecha, para mover el cursor; haz clic derecho o presiona N para ver la línea de comparación más cercana.',
 window:(min:string,max:string)=>`Ventana ${min}–${max} Å`,
 fullViewNote:'Las vistas completa y H/K son ajustes predefinidos de la versión web; Ampliar (Zoom) y las flechas se aplican a la vista normal.',
 note:'Como en VIREO, Ampliar (Zoom) elige una ventana en pasos de 100 Å desde el inicio del espectro cargado y primero incorpora el control de z a su base (como Recentrar); las flechas mueven la ventana 100 Å y pueden rebasar sus extremos en menos de 100 Å; la lectura muestra la longitud de onda observada bajo el cursor y la altura del cursor en el eje de la gráfica, no el valor del espectro.',
});
