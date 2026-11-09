import type {HELP_MENU_EN} from '../../../help/HelpMessages';
import type {Translation} from '../../maps';
/** Front ES1: Spanish (es-419) for OpenVireo's own text in the Help menus. VIREO's menu captions (Help, Topics..., Websites…)
 * are originals (originals.json). A web adaptation by OpenVireo, not CLEA's. */
export const HELP_MENU_ES:Translation<typeof HELP_MENU_EN>=Object.freeze({
 newTab:'(se abre en una pestaña nueva)',
 noEquivalent:(original:string)=>`— VIREO abría ${original}. Ese sitio ya no existe y no hay una página equivalente, así que no se ofrece ningún enlace.`,
 websitesNote:'VIREO abría estas páginas en una ventana nueva del navegador. Aquí se abren en una pestaña nueva solo cuando haces clic en ellas, y no se envía nada. Dos de las direcciones de VIREO ya no existen: 2MASS (xena.harvard.edu) abre la página actual de 2MASS en IRSA (NASA/IPAC), y NVO (www.us-vo.org) abre la página de su sucesor, NAVO de la NASA (NASA Astronomical Virtual Observatories, los observatorios virtuales astronómicos de la NASA).',
 reminderLoading:'Cargando el recordatorio de VIREO…',
 reminderError:'No se pudo cargar el archivo de recordatorio de VIREO (Reminder.obs), o no coincidió con su tamaño y SHA-256 registrados.',
 ok:'Aceptar',cancel:'Cancelar',close:'Cerrar',yes:'Sí',no:'No',
 menuName:Object.freeze({main:'Menú de Ayuda del observatorio',radio:'Menú de Ayuda del radiotelescopio'}),
 radioOff:'El menú de Ayuda de radio de VIREO (Temas..., Acerca de este ejercicio...) está en el panel de control del radiotelescopio, que se abre al encender el telescopio.',
 reminderErrorQuestion:'Entonces VIREO pregunta en su lugar:',
 exitDone:'Terminaste el ejercicio. Una página web no puede cerrarse sola: guarda tu trabajo y luego cierra esta pestaña del navegador cuando quieras.',
 siteAbout:'Acerca de OpenVireo y la privacidad',
 webTopics:'Temas de ayuda…',
 tour:'Hacer el recorrido por el sitio',
 shortcutKey:'?',
 exitNote:'VIREO muestra este recordatorio cuando sales del observatorio durante un ejercicio (después de Run Exercise); si no, solo pregunta si quieres salir. OpenVireo no tiene los pasos Log In ni Run Exercise, así que el observatorio siempre es un ejercicio en curso. En VIREO, Aceptar o Sí cierran el programa; Cancelar o No lo dejan abierto.',
});
