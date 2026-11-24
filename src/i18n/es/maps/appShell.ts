import type {APP_SHELL_MESSAGES_EN} from '../../../components/AppShellMessages';
import type {Translation} from '../../maps';
/** Front ES1: Spanish (es-419) for the app shell: navigation groups, theme switch, toolbar disclosure, the page bar and the recovery notice
 * of a part of the site that cannot load. A web adaptation by OpenVireo, not CLEA's. */
export const APP_SHELL_ES:Translation<typeof APP_SHELL_MESSAGES_EN>=Object.freeze({
 theme:Object.freeze({legend:'Tema de color',system:'Sistema',light:'Claro',dark:'Oscuro'}),
 navGroups:Object.freeze({optical:'Observatorio óptico',radio:'Radioobservatorio',analysis:'Análisis',files:'Archivos',guides:'Guías de los ejercicios'}),
 backupHelpSummary:'Qué incluye una copia de seguridad',
 toolsMenu:'Menú',// the phone menu button; «Herramientas» does not fit beside the brand and Help at 320 px
 skipToContent:'Saltar al contenido',
 pageBar:Object.freeze({label:'Investigación, idioma y ayuda',more:'Más',moreName:'Más acciones de la investigación'}),
 companion:Object.freeze({label:'Paso actual de la guía',stepOf:(n:number,total:number)=>`Paso ${n} de ${total}`,actions:'Acciones de la guía',show:'Muéstrame dónde',details:'Detalles del paso',full:'Guía completa',hide:'Ocultar',hideName:'Ocultar esta guía',notYet:'Ese control todavía no está en pantalla; aparece después de una acción anterior. Esta es la página correcta.',allDone:'Completaste todos los pasos.',
  restart:'Reiniciar ejercicio',restartTitle:'¿Reiniciar este ejercicio?',restartWhat:'El sitio se vuelve a cargar y esta guía se abre en su primer paso.',
  restartLost:'Se pierde todo lo que no hayas guardado: el trabajo de este ejercicio y el de cualquier otra herramienta en esta pestaña.',
  restartSave:'Para conservarlo, cancela y elige primero Guardar investigación.',restartConfirm:'Reiniciar',restartCancel:'Cancelar'}),
 firstLook:Object.freeze({name:'Primer vistazo',dome:'Abre la cúpula',point:'Elige M82 y apunta el telescopio hacia ella',look:'Mírala a través del telescopio',
  spectrum:'Abre su espectro',spectrumDetail:'Solo algunos objetos tienen un espectro en la biblioteca de VIREO; M82 tiene uno. Es el espectro original de la biblioteca de VIREO, no una observación nueva.',
  closing:'Ya diste un primer vistazo. Elige una práctica para seguir adelante.',start:'Guíame (unos 3 min)',help:'Dar un primer vistazo'}),
 recovery:Object.freeze({
  updatedTitle:'Se publicó una nueva versión de OpenVireo',
  updated:'Esta parte del sitio no se pudo cargar porque el sitio se actualizó mientras esta página estaba abierta.',
  errorTitle:'Esta parte de OpenVireo se detuvo por un error',
  error:'Volver a cargar la página suele resolverlo. Si vuelve a pasar, anota qué hiciste justo antes.',
  kept:'El resto del sitio y el resto de tu trabajo en esta pestaña siguen aquí.',
  saveFirst:'Primero guarda tu investigación y luego vuelve a cargar la página para continuar con la versión actual.',
  saveHow:'Vuelve a cargar la página para continuar. El trabajo que guardaste antes con Guardar investigación se puede recuperar después con Restaurar investigación (JSON).',
  save:'Guardar investigación',
  reload:'Volver a cargar la página',
 }),
});
