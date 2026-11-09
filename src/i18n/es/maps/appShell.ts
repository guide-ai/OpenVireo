import type {APP_SHELL_MESSAGES_EN} from '../../../components/AppShellMessages';
import type {Translation} from '../../maps';
/** Front ES1: Spanish (es-419) for the app shell: navigation groups, theme switch, toolbar disclosure and the recovery notice
 * of a part of the site that cannot load. A web adaptation by OpenVireo, not CLEA's. */
export const APP_SHELL_ES:Translation<typeof APP_SHELL_MESSAGES_EN>=Object.freeze({
 theme:Object.freeze({legend:'Tema de color',system:'Sistema',light:'Claro',dark:'Oscuro'}),
 navGroups:Object.freeze({optical:'Observatorio óptico',radio:'Radioobservatorio',analysis:'Análisis',files:'Archivos',guides:'Guías de los ejercicios'}),
 backupHelpSummary:'Qué incluye una copia de seguridad',
 toolsMenu:'Menú',// the phone menu button; «Herramientas» does not fit beside the brand and Help at 320 px
 recovery:Object.freeze({
  updatedTitle:'Se publicó una nueva versión de OpenVireo',
  updated:'Esta parte del sitio no se pudo cargar porque el sitio se actualizó mientras esta página estaba abierta.',
  errorTitle:'Esta parte de OpenVireo se detuvo por un error',
  error:'Volver a cargar la página suele resolverlo. Si vuelve a pasar, anota qué hiciste justo antes.',
  kept:'El resto del sitio y tu demás trabajo en esta pestaña siguen aquí.',
  saveFirst:'Primero guarda tu investigación y luego vuelve a cargar la página para continuar con la versión actual.',
  saveHow:'Vuelve a cargar la página para continuar. El trabajo que guardaste antes con Guardar investigación se puede recuperar después con Restaurar investigación (JSON).',
  save:'Guardar investigación',
  reload:'Volver a cargar la página',
 }),
});
