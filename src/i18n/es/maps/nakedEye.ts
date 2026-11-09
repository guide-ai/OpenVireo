import type {NAKED_EYE_MESSAGES_EN} from '../../../observatory/FieldInfoMessages';
import type {Translation} from '../../maps';
/** Front ES2: Spanish (es-419) for the naked-eye sky through the open dome (Naked Eye Star). A web adaptation by OpenVireo, not CLEA's. */
export const NAKED_EYE_ES:Translation<typeof NAKED_EYE_MESSAGES_EN>=Object.freeze({
 eyebrow:'VIREO · Cúpula abierta',title:'Cielo a simple vista',
 help:'Las estrellas brillantes (V ≤ 5.5) que verías a simple vista por la cúpula abierta, tal como VIREO las dibuja: unos 31° de ancho y 40° de alto, centradas a 45° sobre el horizonte en la dirección a la que apunta el telescopio. Haz clic derecho en una estrella (o mueve el cursor con las flechas del teclado y presiona Enter) para ver sus datos.',
 skyLabel:'Cielo a simple vista por la cúpula. Haz clic derecho en una estrella, o usa las flechas del teclado y Enter, para abrir Estrella a simple vista.',
 loading:'Cargando el archivo de estrellas a simple vista…',
 fileError:'No se pudo cargar el archivo de estrellas a simple vista (NkdEye.dat), o no coincidió con su tamaño y SHA-256 registrados.',
 caption:(site:string,utc:string,count:number)=>`${site} · ${utc} UT (el momento en que se abrió la cúpula; cierra y vuelve a abrir la cúpula para redibujar) · ${count} ${count===1?'estrella visible':'estrellas visibles'}.`,
 adaptation:'Adaptación web: las estrellas se dibujan como discos según el nivel de brillo de VIREO en lugar de sus sprites de estrellas, y no se dibujan las compuertas de la cúpula. Las posiciones, la región visible (incluida la peculiaridad de VIREO que omite muchas estrellas justo al oeste de la línea central cuando se mira al sur) y la selección con clic derecho siguen al original.',
 showAtCursor:'Mostrar la estrella del cursor',
 tapAdaptation:'Adaptación web para pantallas táctiles: toca el cielo para mover el cursor (+) y luego presiona “Mostrar la estrella del cursor”. Un toque por sí solo no abre la estrella, igual que un clic izquierdo no hace nada en VIREO.',
 magNote:'Como en VIREO, se puede escribir la Mag. V, pero no se guarda nada.',
});
