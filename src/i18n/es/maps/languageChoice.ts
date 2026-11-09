import type {LANGUAGE_CHOICE_EN} from '../../../components/LanguageChoiceMessages';
import type {Translation} from '../../maps';
/** Front ES1: Spanish (es-419) for the language selector and its reload dialog. The option names stay bilingual. */
export const LANGUAGE_CHOICE_ES:Translation<typeof LANGUAGE_CHOICE_EN>=Object.freeze({
 legend:'Idioma / Language',
 english:'English',
 spanish:'Español',
 title:'¿Cambiar el idioma?',
 reload:(language:string)=>`La página se volverá a cargar en ${language}, en la misma página del sitio.`,
 lost:'Se pierde el trabajo que solo está en pantalla: la posición actual del telescopio, las exposiciones en curso, las mediciones, las ventanas abiertas, el modo instructor y todo lo que no hayas guardado en un archivo.',
 kept:'Los archivos que guardaste en tu computadora no cambian; Restaurar investigación (JSON) vuelve a cargar una investigación. Este navegador también conserva tus resultados de observación confirmados y tus preferencias de visualización.',
 save:'Guardar investigación',
 saveNote:'Guardar investigación descarga primero un archivo con tu trabajo actual. Después cambia el idioma.',
 change:'Cambiar y volver a cargar',
 cancel:'Cancelar',
 preview:'Vista previa antes del lanzamiento: el idioma lo elige la dirección (?lang=) y no se guarda.',
 notRemembered:'Este navegador no permite a OpenVireo guardar la elección, así que solo se aplica a esta carga de la página.',
 originals:'Mostrar los textos originales de VIREO (inglés)',
 originalsNote:'Los textos de los menús, ventanas y mensajes de VIREO aparecen en inglés, tal como los escribe VIREO. Los textos propios de OpenVireo siguen en el idioma elegido. Se aplica en la próxima carga de la página.',
 originalsNotStored:'Este navegador no permite a OpenVireo guardar esta opción.',
});
